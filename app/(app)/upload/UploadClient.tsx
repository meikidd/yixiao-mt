'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, ImagePlus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useUploadStore } from '@/store/upload'
import { preprocessDocumentImage } from '@/lib/opencv/processor'
import { cn } from '@/lib/utils'

const STEP_LABELS = {
  idle: '',
  preprocessing: '正在处理图片…',
  uploading: '正在上传图片…',
  analyzing: 'AI 识别文字中…',
  saving: '正在保存…',
  done: '完成！',
  error: '出现错误',
}

export function UploadClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { step, previewUrl, setStep, setPreviewUrl, setError, reset } = useUploadStore()
  const [resultArticleId, setResultArticleId] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }

    reset()
    setPreviewUrl(URL.createObjectURL(file))
    setStep('preprocessing')

    try {
      // Step 1: OpenCV perspective correction
      const { blob: preprocessed } = await preprocessDocumentImage(file)

      // Step 2: Compress to stay under Claude API's 5 MB base64 limit (~3.7 MB raw)
      const compressed = await compressImage(preprocessed, { maxDimension: 1600, maxBytes: 3_700_000 })

      // Step 3: Upload + OCR
      setStep('uploading')
      const formData = new FormData()
      formData.append('image', compressed, 'image.jpg')

      setStep('analyzing')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '处理失败')
        return
      }

      setStep('saving')
      setResultArticleId(data.articleId)
      setStep('done')

      // Navigate to the article after a brief pause
      setTimeout(() => {
        router.push(`/articles/${data.articleId}`)
      }, 1500)
    } catch (err) {
      setError('处理失败，请重试')
    }
  }

  const isProcessing = !['idle', 'done', 'error'].includes(step)

  return (
    <div className="space-y-5">
      {/* Image preview */}
      {previewUrl && (
        <div className="relative rounded-xl overflow-hidden border aspect-[3/4] bg-muted">
          <img src={previewUrl} alt="预览" className="w-full h-full object-contain" />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm font-medium">{STEP_LABELS[step]}</p>
            </div>
          )}
          {step === 'done' && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white">
              <CheckCircle2 className="h-10 w-10 text-green-400 mb-2" />
              <p className="text-sm font-medium">识别完成！正在跳转…</p>
            </div>
          )}
        </div>
      )}

      {step === 'error' && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-3 text-destructive text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            处理出现问题，请重新拍照
          </CardContent>
        </Card>
      )}

      {/* Upload buttons */}
      {!isProcessing && step !== 'done' && (
        <div className="space-y-3">
          {/* Camera capture (mobile) */}
          <Button
            size="lg"
            className="w-full h-14 text-base"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5 mr-2" />
            拍照
          </Button>

          {/* File picker */}
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-base"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5 mr-2" />
            从相册选择
          </Button>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Tips */}
      {step === 'idle' && (
        <div className="text-sm text-muted-foreground space-y-1.5 bg-muted rounded-xl p-4">
          <p className="font-medium text-foreground mb-2">拍摄小提示：</p>
          <p>📖 让书页尽量平整，光线要充足</p>
          <p>✏️ 你用铅笔划的线和圈会被自动识别</p>
          <p>📝 旁边的手写笔记也会被提取</p>
          <p>📸 略微歪斜没关系，系统会自动纠正</p>
        </div>
      )}
    </div>
  )
}

async function compressImage(
  blob: Blob,
  { maxDimension = 1600, maxBytes = 3_700_000 }: { maxDimension?: number; maxBytes?: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down if either dimension exceeds maxDimension
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      // Try quality 0.85 first, then reduce until under maxBytes
      const tryQuality = (quality: number) => {
        canvas.toBlob((result) => {
          if (!result) { reject(new Error('canvas empty')); return }
          if (result.size <= maxBytes || quality <= 0.4) {
            resolve(result)
          } else {
            tryQuality(Math.round((quality - 0.1) * 10) / 10)
          }
        }, 'image/jpeg', quality)
      }
      tryQuality(0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
