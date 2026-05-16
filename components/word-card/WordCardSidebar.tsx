'use client'

import { ArrowLeft } from 'lucide-react'
import { useWordCardStore } from '@/store/wordCard'
import { WordCardPanel } from './WordCardPanel'
import { Button } from '@/components/ui/button'

export function WordCardSidebar() {
  const { open, hanzi, context, articleId, close } = useWordCardStore()

  if (!open) return null

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={close}
        className="mb-1 -ml-2 h-8 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回
      </Button>
      <WordCardPanel hanzi={hanzi} context={context} articleId={articleId} />
    </div>
  )
}
