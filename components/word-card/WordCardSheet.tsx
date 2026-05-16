'use client'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWordCardStore } from '@/store/wordCard'
import { WordCardPanel } from './WordCardPanel'

export function WordCardSheet() {
  const { open, hanzi, context, articleId, close, sidebarMode } = useWordCardStore()

  if (sidebarMode) return null

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-8 pt-4">
        <SheetTitle className="sr-only">{hanzi}</SheetTitle>
        {open && <WordCardPanel hanzi={hanzi} context={context} articleId={articleId} />}
      </SheetContent>
    </Sheet>
  )
}
