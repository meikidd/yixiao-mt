'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { pinyin } from 'pinyin-pro'
import { X } from 'lucide-react'
import { useWordCardStore } from '@/store/wordCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  content: string
  vocabWords?: string[]
  className?: string
  articleId?: string
  pinyinMode?: boolean
}

const CJK_RE = /[一-鿿㐀-䶿]/
const LATIN_FONTS = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'
const BUTTON_HEIGHT = 36
const GAP = 6

function buildVocabHighlightedSet(chars: string[], vocabSet: Set<string>): Set<number> {
  const highlighted = new Set<number>()
  for (let i = 0; i < chars.length; i++) {
    for (let len = 1; len <= 4 && i + len <= chars.length; len++) {
      if (vocabSet.has(chars.slice(i, i + len).join(''))) {
        for (let j = i; j < i + len; j++) highlighted.add(j)
      }
    }
  }
  return highlighted
}

function segmentText(text: string): { text: string; isCJK: boolean }[] {
  const segments: { text: string; isCJK: boolean }[] = []
  let current = ''
  let currentIsCJK = false
  for (const char of text) {
    const isCJK = CJK_RE.test(char)
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

interface Selection {
  anchorIdx: number
  endIdx: number
}

interface ButtonPos {
  x: number
  y: number
}

function computeAnchorPos(anchorIdx: number): ButtonPos | null {
  const elem = document.querySelector(`[data-char-idx="${anchorIdx}"]`) as HTMLElement | null
  if (!elem) return null
  const rect = elem.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const spaceBelow = window.innerHeight - rect.bottom
  const above = spaceBelow < BUTTON_HEIGHT + GAP * 2
  const y = above ? rect.top - GAP - BUTTON_HEIGHT : rect.bottom + GAP
  return { x, y }
}

export function ArticleText({ content, vocabWords = [], className, articleId, pinyinMode = false }: Props) {
  const { openWord, savedWords } = useWordCardStore()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [buttonPos, setButtonPos] = useState<ButtonPos | null>(null)

  const allVocab = new Set([...vocabWords, ...savedWords])
  const paragraphs = content.split(/\n+/).filter(Boolean)

  // Flat list of CJK chars in document order — index matches data-char-idx
  const flatCJKChars = useMemo(() => {
    const result: { char: string; para: string }[] = []
    for (const para of paragraphs) {
      if (para === '---') continue
      for (const char of para) {
        if (CJK_RE.test(char)) result.push({ char, para })
      }
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const clearSelection = useCallback(() => {
    setSelection(null)
    setButtonPos(null)
  }, [])

  // Keep button position in sync with scroll and resize
  useEffect(() => {
    if (!selection) return
    const update = () => setButtonPos(computeAnchorPos(selection.anchorIdx))
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [selection])

  // Dismiss selection on any click outside char spans or the floating button
  useEffect(() => {
    if (!selection) return
    const handler = () => clearSelection()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [selection, clearSelection])

  const handleCharClick = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelection(prev => {
      if (prev === null) {
        // First click: set anchor
        setButtonPos(computeAnchorPos(idx))
        return { anchorIdx: idx, endIdx: idx }
      }
      if (idx === prev.anchorIdx && prev.anchorIdx === prev.endIdx) {
        // Clicking the only selected char: cancel
        setButtonPos(null)
        return null
      }
      // Extend range from anchor to this char
      return { anchorIdx: prev.anchorIdx, endIdx: idx }
    })
  }, [])

  const handleLookup = () => {
    if (!selection) return
    const min = Math.min(selection.anchorIdx, selection.endIdx)
    const max = Math.max(selection.anchorIdx, selection.endIdx)
    const text = flatCJKChars.slice(min, max + 1).map(c => c.char).join('')
    const para = flatCJKChars[selection.anchorIdx]?.para ?? ''
    openWord(text, para, articleId)
    clearSelection()
  }

  const selectedSet = selection
    ? new Set(
        Array.from(
          { length: Math.abs(selection.endIdx - selection.anchorIdx) + 1 },
          (_, i) => Math.min(selection.anchorIdx, selection.endIdx) + i
        )
      )
    : new Set<number>()

  let globalCharIdx = 0

  return (
    <>
      <div
        className={cn('text-xl tracking-wide select-none', pinyinMode ? 'leading-[3rem]' : 'leading-10', className)}
      >
        {paragraphs.map((para, pi) => {
          if (para === '---') return <hr key={pi} className="my-4 border-border" />

          const segments = segmentText(para)
          return (
            <p key={pi} className="mb-4">
              {segments.map((seg, si) => {
                if (!seg.isCJK) return <span key={si}>{seg.text}</span>

                const chars = Array.from(seg.text)
                const highlighted = buildVocabHighlightedSet(chars, allVocab)

                return (
                  <span key={si}>
                    {chars.map((char, ci) => {
                      const idx = globalCharIdx++
                      const isSelected = selectedSet.has(idx)
                      const charPinyin = pinyinMode ? pinyin(char, { toneType: 'symbol' }) : ''
                      const charClass = cn(
                        'cursor-pointer rounded-sm transition-colors',
                        isSelected
                          ? 'bg-primary/25 text-primary'
                          : [
                              'hover:bg-primary/10 hover:text-primary',
                              highlighted.has(ci)
                                ? 'underline decoration-primary decoration-2 underline-offset-4'
                                : '',
                            ]
                      )

                      if (pinyinMode) {
                        return (
                          <ruby
                            key={ci}
                            data-char-idx={idx}
                            onClick={(e) => handleCharClick(idx, e)}
                            className="cursor-pointer"
                            style={{ marginRight: '2px' }}
                          >
                            <span className={charClass}>{char}</span>
                            <rt
                              lang="en"
                              style={{ fontFamily: LATIN_FONTS, letterSpacing: '-0.03em' }}
                              className="text-[0.5em] text-primary/70 not-italic"
                            >
                              {charPinyin}
                            </rt>
                          </ruby>
                        )
                      }
                      return (
                        <span
                          key={ci}
                          data-char-idx={idx}
                          onClick={(e) => handleCharClick(idx, e)}
                          className={charClass}
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

      {buttonPos && selection && typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50 flex translate-x-[-10px] translate-y-[-4px] shadow-lg rounded-lg overflow-hidden"
            style={{ left: buttonPos.x, top: buttonPos.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm"
              variant="outline"
              onClick={handleLookup}
              className="cursor-pointer rounded-none rounded-l-lg border-r-0"
            >
              查词
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
              className="cursor-pointer rounded-none rounded-r-lg"
            >
              取消
            </Button>
          </div>,
          document.body
        )}
    </>
  )
}
