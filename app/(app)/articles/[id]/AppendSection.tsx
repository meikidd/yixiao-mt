'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Camera, ImagePlus, Loader2, CheckCircle2, AlertCircle, X, PlusCircle } from 'lucide-react'
import { preprocessDocumentImage } from '@/lib/opencv/processor'
import { compressImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'ok' | 'error'
  blob?: Blob
}

type Phase = 'idle' | 'staged' | 'processing' | 'uploading' | 'done' | 'error'

interface Props {
  articleId: string
  inlineButton?: boolean
}

export function AppendSection({ articleId, inlineButton = false }: Props) {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ImageItem[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [processingIdx, setProcessingIdx] = useState(-1)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function addFiles(files: FileList) {
    const newItems: ImageItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: 'pending',
      }))
    if (newItems.length === 0) return
    setItems((prev) => [...prev, ...newItems])
    setPhase('staged')
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      const next = prev.filter((it) => it.id !== id)
      if (next.length === 0) setPhase('idle')
      return next
    })
  }

  async function handleAppend() {
    if (items.length === 0) return
    setPhase('processing')

    const processed: ImageItem[] = []
    for (let i = 0; i < items.length; i++) {
      setProcessingIdx(i)
      const item = items[i]
      try {
        const { blob: preprocessed } = await preprocessDocumentImage(item.file)
        const compressed = await compressImage(preprocessed, { maxDimension: 1600, maxBytes: 3_700_000 })
        const updated = { ...item, status: 'ok' as const, blob: compressed }
        processed.push(updated)
        setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)))
      } catch {
        const failed = { ...item, status: 'error' as const }
        processed.push(failed)
        setItems((prev) => prev.map((it) => (it.id === item.id ? failed : it)))
      }
    }
    setProcessingIdx(-1)

    const valid = processed.filter((it) => it.status === 'ok' && it.blob)
    if (valid.length === 0) {
      setPhase('error')
      setErrorMsg('所有图片处理失败，请重试')
      return
    }

    setPhase('uploading')
    const formData = new FormData()
    valid.forEach((it) => formData.append('images', it.blob!, 'image.jpg'))

    try {
      const res = await fetch(`/api/articles/${articleId}/append`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setPhase('error')
        setErrorMsg(data.error ?? '追加失败')
        return
      }
      setPhase('done')
      setTimeout(() => {
        router.refresh()
        reset()
        setOpen(false)
      }, 1000)
    } catch {
      setPhase('error')
      setErrorMsg('网络错误，请重试')
    }
  }

  function reset() {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl))
    setItems([])
    setPhase('idle')
    setErrorMsg(null)
    setProcessingIdx(-1)
  }

  const isProcessing = phase === 'processing' || phase === 'uploading'

  if (!open) {
    if (inlineButton) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 h-32 w-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <PlusCircle className="h-6 w-6" />
          <span className="text-[10px]">追加</span>
        </button>
      )
    }
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="h-4 w-4 mr-1.5" />
        追加照片
      </Button>
    )
  }

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-muted">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">追加照片到此文章</p>
        {!isProcessing && (
          <button onClick={() => { reset(); setOpen(false) }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {phase === 'error' && (
        <div className="flex items-center justify-between text-destructive text-sm">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </div>
          <button onClick={reset} className="text-xs underline">重试</button>
        </div>
      )}

      {/* Thumbnails */}
      {items.length > 0 && (
        <div className={cn('grid gap-2', items.length === 1 ? 'grid-cols-1 max-w-[160px]' : 'grid-cols-3')}>
          {items.map((item, i) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
              {processingIdx === i && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
              {item.status === 'ok' && processingIdx > i && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              )}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>
              )}
              <span className="absolute bottom-0.5 left-0.5 bg-black/50 text-white text-[10px] rounded px-1">
                {i + 1}
              </span>
              {phase === 'staged' && (
                <button
                  className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 hover:bg-black/70"
                  onClick={() => removeItem(item.id)}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Status text while processing */}
      {isProcessing && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {phase === 'processing'
            ? `正在处理第 ${processingIdx + 1} / ${items.length} 张…`
            : 'AI 识别文字中…'}
        </p>
      )}

      {phase === 'done' && (
        <p className="text-sm text-green-600 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          追加成功！
        </p>
      )}

      {/* Action buttons */}
      {(phase === 'idle' || phase === 'staged') && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-3.5 w-3.5 mr-1" />
              拍照
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => galleryRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5 mr-1" />
              相册
            </Button>
          </div>
          {items.length > 0 && (
            <Button size="sm" className="w-full" onClick={handleAppend}>
              追加 {items.length} 张
            </Button>
          )}
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
      />
    </div>
  )
}
