'use client'

import { ArrowLeft, BookOpen } from 'lucide-react'
import { useWordCardStore } from '@/store/wordCard'
import { WordCardPanel } from '@/components/word-card/WordCardPanel'
import { Pinyin } from '@/components/ui/pinyin'
import { Button } from '@/components/ui/button'

interface VocabWord {
  hanzi: string
  pinyin: string | null
}

interface Props {
  words: VocabWord[]
  articleId: string
}

export function ArticleWordSidebar({ words, articleId }: Props) {
  const { open, hanzi, context, close, openWord } = useWordCardStore()

  if (open) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={close}
          className="mb-4 -ml-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <WordCardPanel hanzi={hanzi} context={context} articleId={articleId} />
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        本文词汇
      </p>

      {words.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm">暂无词汇</p>
          <p className="text-xs mt-1 opacity-70">点击正文中的汉字查词</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {words.map((w) => (
            <li key={w.hanzi}>
              <button
                onClick={() => openWord(w.hanzi, '', articleId)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
              >
                <span className="font-medium text-base">{w.hanzi}</span>
                {w.pinyin && (
                  <span className="block text-xs text-muted-foreground mt-0.5 group-hover:text-foreground/60 transition-colors">
                    <Pinyin value={w.pinyin} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
