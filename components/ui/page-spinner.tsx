import { Loader2 } from 'lucide-react'

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}
