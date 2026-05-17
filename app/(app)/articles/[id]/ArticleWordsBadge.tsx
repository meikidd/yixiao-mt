'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Pinyin } from '@/components/ui/pinyin'
import { useWordCardStore } from '@/store/wordCard'

interface VocabWord {
  hanzi: string
  pinyin: string | null
}

interface Props {
  words: VocabWord[]
  articleId: string
}

export function ArticleWordsBadge({ words, articleId }: Props) {
  const [open, setOpen] = useState(false)
  const { openWord } = useWordCardStore()

  if (words.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium hover:bg-blue-100 transition-colors"
      >
        {words.length} 个词汇
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[60vh] overflow-y-auto rounded-t-2xl px-5 pb-8">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>本篇词汇 ({words.length})</SheetTitle>
          </SheetHeader>
          <div className="pt-4 flex flex-wrap gap-2">
            {words.map((w) => (
              <button
                key={w.hanzi}
                onClick={() => {
                  setOpen(false)
                  setTimeout(() => openWord(w.hanzi, '', articleId), 200)
                }}
                className="flex flex-col items-center px-3 py-2 rounded-lg border bg-muted hover:bg-muted transition-colors min-w-[56px]"
              >
                <span className="text-lg font-medium">{w.hanzi}</span>
                <Pinyin value={w.pinyin} className="text-[10px] text-muted-foreground mt-0.5" />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
