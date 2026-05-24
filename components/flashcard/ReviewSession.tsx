'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FlashCard } from './FlashCard'
import { CheckCircle2, Brain } from 'lucide-react'
import { basePath } from '@/lib/base-path'

interface ReviewWord {
  userWordId: string
  wordId: string
  hanzi: string
  pinyin: string
  definition: string
  status: string
  reviewCount: number
}

interface Props {
  initialWords: ReviewWord[]
}

export function ReviewSession({ initialWords }: Props) {
  const [words] = useState<ReviewWord[]>(initialWords)
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState<Record<string, 'known' | 'again'>>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleResult(wordId: string, result: 'known' | 'again') {
    setResults((prev) => ({ ...prev, [wordId]: result }))

    await fetch(`${basePath}/api/review/${wordId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    })

    if (current < words.length - 1) {
      setCurrent((c) => c + 1)
    } else {
      setDone(true)
    }
  }

  if (done) {
    const knownCount = Object.values(results).filter((r) => r === 'known').length
    return (
      <div className="text-center py-16 space-y-4">
        <Brain className="h-16 w-16 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">复习完成！</h2>
        <p className="text-muted-foreground">
          共复习 <strong>{words.length}</strong> 个词，
          记住了 <strong className="text-green-600">{knownCount}</strong> 个
        </p>
        {knownCount < words.length && (
          <p className="text-sm text-muted-foreground">
            还有 {words.length - knownCount} 个词需要继续加油！
          </p>
        )}
      </div>
    )
  }

  const word = words[current]
  const progress = Math.round((current / words.length) * 100)

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{current + 1} / {words.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <FlashCard
        key={word.wordId}
        hanzi={word.hanzi}
        pinyin={word.pinyin}
        definition={word.definition}
        onKnown={() => handleResult(word.wordId, 'known')}
        onAgain={() => handleResult(word.wordId, 'again')}
      />
    </div>
  )
}
