'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWordCardStore } from '@/store/wordCard'
import type { WordRow, WordRelationshipRow } from '@/lib/supabase/types'
import { RelatedWords } from './RelatedWords'
import { Loader2, BookmarkPlus, BookmarkCheck, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Pinyin } from '@/components/ui/pinyin'

interface LookupData {
  word: WordRow
  relationships: (WordRelationshipRow & { word_b: { id: string; hanzi: string } | null })[]
  learnedWords: string[]
  isSaved: boolean
}

export function WordCardSheet() {
  const { open, hanzi, context, articleId, close, addSavedWord, savedWords } = useWordCardStore()
  const [data, setData] = useState<LookupData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!open || !hanzi) return
    setData(null)
    setError(null)
    setLoading(true)
    setJustSaved(false)

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

  async function handleSave() {
    if (!data?.word) return
    setSaving(true)
    try {
      const res = await fetch('/api/words/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: data.word.id, hanzi: data.word.hanzi, articleId, context }),
      })
      if (res.ok) {
        setJustSaved(true)
        addSavedWord(data.word.hanzi)
      }
    } finally {
      setSaving(false)
    }
  }

  const isSaved = justSaved || !!data?.isSaved || savedWords.has(hanzi)
  const rawEx = data?.word?.example_sentences
  const exampleSentences: { sentence: string }[] = !rawEx
    ? []
    : Array.isArray(rawEx)
    ? (rawEx as { sentence: string }[])
    : typeof rawEx === 'string'
    ? (() => { try { return JSON.parse(rawEx) } catch { return [] } })()
    : []

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) close() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5 pb-8">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-3xl font-bold tracking-wider">{hanzi}</SheetTitle>
                {data?.word?.id && (
                  <Link
                    href={`/word/${data.word.id}`}
                    onClick={close}
                    className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                    title="查看详情"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
              {data?.word?.pinyin && (
                <p className="text-base text-muted-foreground mt-1"><Pinyin value={data.word.pinyin} /></p>
              )}
            </div>
            {data?.word && !loading && (
              <Button
                size="sm"
                variant={isSaved ? 'secondary' : 'default'}
                onClick={handleSave}
                disabled={isSaved || saving}
                className="shrink-0 mt-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <><BookmarkCheck className="h-4 w-4 mr-1.5" />已添加</>
                ) : (
                  <><BookmarkPlus className="h-4 w-4 mr-1.5" />添加到词汇表</>
                )}
              </Button>
            )}
          </div>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">查询中…</span>
          </div>
        )}

        {error && <div className="py-8 text-center text-destructive">{error}</div>}

        {data?.word && !loading && (
          <div className="py-4 space-y-5">
            {data.word.part_of_speech && (
              <div><Badge variant="secondary">{data.word.part_of_speech}</Badge></div>
            )}

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
              <RelatedWords relationships={data.relationships} learnedWords={data.learnedWords} />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
