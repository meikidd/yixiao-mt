'use client'

import { useRef } from 'react'
import { pinyin } from 'pinyin-pro'
import { useWordCardStore } from '@/store/wordCard'
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

export function ArticleText({ content, vocabWords = [], className, articleId, pinyinMode = false }: Props) {
  const { openWord, savedWords } = useWordCardStore()
  const selectionHandledRef = useRef(false)

  const allVocab = new Set([...vocabWords, ...savedWords])
  const paragraphs = content.split(/\n+/).filter(Boolean)

  function handleContainerPointerUp() {
    const sel = window.getSelection()
    const text = sel?.toString() ?? ''
    const cjk = [...text].filter((c) => CJK_RE.test(c)).join('')
    if (cjk.length >= 2) {
      selectionHandledRef.current = true
      openWord(cjk, '', articleId)
      sel?.removeAllRanges()
      setTimeout(() => { selectionHandledRef.current = false }, 150)
    }
  }

  function handleCharClick(char: string, para: string) {
    if (selectionHandledRef.current) return
    const selText = window.getSelection()?.toString().trim() ?? ''
    const cjk = [...selText].filter((c) => CJK_RE.test(c)).join('')
    if (cjk.length >= 2) return
    openWord(char, para, articleId)
  }

  return (
    <div
      className={cn('text-xl tracking-wide select-text', pinyinMode ? 'leading-[3rem]' : 'leading-10', className)}
      onPointerUp={handleContainerPointerUp}
    >
      {paragraphs.map((para, pi) => {
        if (para === '---') {
          return <hr key={pi} className="my-4 border-border" />
        }

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
                    const charPinyin = pinyinMode ? pinyin(char, { toneType: 'symbol' }) : ''
                    const charClass = cn(
                      'cursor-pointer rounded-sm transition-colors hover:bg-primary/10 hover:text-primary',
                      highlighted.has(ci)
                        ? 'underline decoration-primary decoration-2 underline-offset-4'
                        : ''
                    )
                    if (pinyinMode) {
                      return (
                        <ruby key={ci} onClick={() => handleCharClick(char, para)} className="cursor-pointer" style={{ marginRight: '2px' }}>
                          <span className={charClass}>{char}</span>
                          <rt lang="en" style={{ fontFamily: LATIN_FONTS, letterSpacing: '-0.03em' }} className="text-[0.5em] text-primary/70 not-italic">{charPinyin}</rt>
                        </ruby>
                      )
                    }
                    return (
                      <span
                        key={ci}
                        onClick={() => handleCharClick(char, para)}
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
  )
}
