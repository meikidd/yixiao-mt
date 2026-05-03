'use client'

import { useWordCardStore } from '@/store/wordCard'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  annotatedWords?: string[]
  className?: string
  articleId?: string
}

// Segment article text into words/chars for click-to-lookup
// We split on punctuation/spaces, keep CJK chars clickable
function segmentText(text: string): { text: string; isCJK: boolean }[] {
  const segments: { text: string; isCJK: boolean }[] = []
  let current = ''
  let currentIsCJK = false

  for (const char of text) {
    const isCJK = /[一-鿿㐀-䶿]/.test(char)
    if (isCJK === currentIsCJK) {
      current += char
    } else {
      if (current) segments.push({ text: current, isCJK: currentIsCJK })
      current = char
      currentIsCJK = isCJK
    }
  }
  if (current) segments.push({ text: current, isCJK: currentIsCJK })
  return segments
}

export function ArticleText({ content, annotatedWords = [], className, articleId }: Props) {
  const { openWord } = useWordCardStore()
  const annotatedSet = new Set(annotatedWords)

  const paragraphs = content.split(/\n+/).filter(Boolean)

  return (
    <div className={cn('leading-8 text-base', className)}>
      {paragraphs.map((para, pi) => {
        if (para === '---') {
          return <hr key={pi} className="my-4 border-border" />
        }

        const segments = segmentText(para)
        return (
          <p key={pi} className="mb-4">
            {segments.map((seg, si) => {
              if (!seg.isCJK) {
                return <span key={si}>{seg.text}</span>
              }
              // For CJK segments, allow clicking on individual chars or 2-char combos
              const chars = Array.from(seg.text)
              return (
                <span key={si}>
                  {chars.map((char, ci) => {
                    const isAnnotated = annotatedSet.has(char)
                    // Try 2-char word containing this char
                    const twoChar = chars.slice(ci, ci + 2).join('')
                    const twoAnnotated = annotatedSet.has(twoChar)

                    return (
                      <span
                        key={ci}
                        onClick={() => openWord(char, para)}
                        className={cn(
                          'cursor-pointer rounded-sm transition-colors hover:bg-primary/10 hover:text-primary',
                          isAnnotated || twoAnnotated ? 'underline decoration-primary decoration-2 underline-offset-4' : ''
                        )}
                      >
                        {char}
                      </span>
                    )
                  })}
                </span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
