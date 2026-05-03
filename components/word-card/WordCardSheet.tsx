'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useWordCardStore } from '@/store/wordCard'
import type { WordRow, WordRelationshipRow } from '@/lib/supabase/types'
import { RelatedWords } from './RelatedWords'
import { Loader2 } from 'lucide-react'

interface LookupData {
  word: WordRow
  relationships: (WordRelationshipRow & { word_b: { id: string; hanzi: string } | null })[]
  learnedWords: string[]
}

export function WordCardSheet() {
  const { open, hanzi, context, close } = useWordCardStore()
  const [data, setData] = useState<LookupData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !hanzi) return
    setData(null)
    setError(null)
    setLoading(true)

    fetch('/api/words/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanzi, context }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('网络错误，请重试'))
      .finally(() => setLoading(false))
  }, [open, hanzi, context])

  const exampleSentences = data?.word?.example_sentences
    ? (data.word.example_sentences as { sentence: string }[])
    : []

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-3xl font-bold tracking-wider">{hanzi}</SheetTitle>
          {data?.word?.pinyin && (
            <p className="text-base text-muted-foreground">{data.word.pinyin}</p>
          )}
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">查询中…</span>
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-destructive">{error}</div>
        )}

        {data?.word && !loading && (
          <div className="py-4 space-y-5">
            <div className="flex items-center gap-2">
              {data.word.part_of_speech && (
                <Badge variant="secondary">{data.word.part_of_speech}</Badge>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">释义</h3>
              <p className="text-base leading-relaxed">{data.word.definition}</p>
            </div>

            {data.word.usage_notes && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">用法</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{data.word.usage_notes}</p>
              </div>
            )}

            {exampleSentences.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">例句</h3>
                <ul className="space-y-2">
                  {exampleSentences.map((ex, i) => (
                    <li key={i} className="text-sm bg-muted rounded-lg px-3 py-2.5 leading-relaxed">
                      {ex.sentence}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.relationships.length > 0 && (
              <RelatedWords
                relationships={data.relationships}
                learnedWords={data.learnedWords}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
