import { UploadClient } from './UploadClient'

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-bold mb-2">拍照录入</h1>
      <p className="text-sm text-muted-foreground mb-6">拍下华文书页，系统会自动提取文字和你标注的词</p>
      <UploadClient />
    </div>
  )
}
