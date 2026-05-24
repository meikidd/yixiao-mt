'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, ImagePlus, Loader2, CheckCircle2, AlertCircle, X, Upload } from 'lucide-react'
import { preprocessDocumentImage } from '@/lib/opencv/processor'
import { compressImage } from '@/lib/image-utils'
import { cn } from '@/lib/utils'
import { basePath } from '@/lib/base-path'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  status: 'pending' | 'ok' | 'error'
  blob?: Blob
}

type Phase = 'idle' | 'staged' | 'processing' | 'uploading' | 'done' | 'error'

export function UploadClient() {
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
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

  async function handleUpload() {
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
      const res = await fetch(`${basePath}/api/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setPhase('error')
        setErrorMsg(data.error ?? '上传失败')
        return
      }
      setPhase('done')
      setTimeout(() => router.push(`/articles/${data.articleId}`), 1200)
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

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {phase === 'error' && (
        <Card className="border-destructive bg-red-50">
          <CardContent className="flex items-center justify-between p-3 text-destructive text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {errorMsg ?? '处理出现问题，请重新拍照'}
            </div>
            <button onClick={reset} className="text-xs underline shrink-0">重新开始</button>
          </CardContent>
        </Card>
      )}

      {/* Primary action buttons */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <Button size="lg" className="w-full h-14 text-base" onClick={() => cameraRef.current?.click()}>
            <Camera className="h-5 w-5 mr-2" />
            拍照
          </Button>
          <Button size="lg" variant="outline" className="w-full h-14 text-base" onClick={() => galleryRef.current?.click()}>
            <ImagePlus className="h-5 w-5 mr-2" />
            从相册选择
          </Button>
        </div>
      )}

      {/* Staged: thumbnails + add more + upload button */}
      {phase === 'staged' && (
        <div className="space-y-3">
          <ThumbnailGrid items={items} processingIdx={-1} onRemove={removeItem} canRemove />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
              <Camera className="h-4 w-4 mr-1" />
              再拍一张
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => galleryRef.current?.click()}>
              <ImagePlus className="h-4 w-4 mr-1" />
              添加图片
            </Button>
          </div>
          <Button size="lg" className="w-full h-14 text-base" onClick={handleUpload}>
            <Upload className="h-5 w-5 mr-2" />
            上传 {items.length} 张照片
          </Button>
        </div>
      )}

      {/* Processing: thumbnails with progress */}
      {isProcessing && (
        <div className="space-y-3">
          <ThumbnailGrid items={items} processingIdx={processingIdx} onRemove={() => {}} canRemove={false} />
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {phase === 'processing'
              ? `正在处理第 ${processingIdx + 1} / ${items.length} 张…`
              : 'AI 识别文字中…'}
          </div>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="space-y-3">
          <ThumbnailGrid items={items} processingIdx={-1} onRemove={() => {}} canRemove={false} />
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 py-2">
            <CheckCircle2 className="h-5 w-5" />
            识别完成！正在跳转…
          </div>
        </div>
      )}

      {/* Tips (idle only) */}
      {phase === 'idle' && (
        <div className="text-sm text-muted-foreground space-y-1.5 bg-muted rounded-xl p-4">
          <p className="font-medium text-foreground mb-2">拍摄小提示：</p>
          <p>📖 让书页尽量平整，光线要充足</p>
          <p>✏️ 你用铅笔划的线和圈会被自动识别</p>
          <p>📝 旁边的手写笔记也会被提取</p>
          <p>📸 略微歪斜没关系，系统会自动纠正</p>
          <p>📚 可以一次选多张，自动合并成一篇</p>
        </div>
      )}

      {/* Hidden file inputs */}
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

function ThumbnailGrid({
  items,
  processingIdx,
  onRemove,
  canRemove,
}: {
  items: ImageItem[]
  processingIdx: number
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  return (
    <div className={cn('grid gap-2', items.length === 1 ? 'grid-cols-1' : 'grid-cols-3')}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            'relative rounded-lg overflow-hidden border bg-muted',
            items.length === 1 ? 'aspect-[3/4]' : 'aspect-square'
          )}
        >
          <img
            src={item.previewUrl}
            alt={`第 ${i + 1} 张`}
            className="w-full h-full object-cover"
          />
          {/* Overlay for current processing item */}
          {processingIdx === i && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
          {/* Checkmark for already-processed items */}
          {item.status === 'ok' && processingIdx > i && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
          )}
          {/* Error state */}
          {item.status === 'error' && (
            <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
          )}
          {/* Page number badge */}
          <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs rounded px-1">
            {i + 1}
          </span>
          {/* Remove button */}
          {canRemove && (
            <button
              className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 hover:bg-black/70"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-3 w-3 text-white" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
