'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWordCardStore } from '@/store/wordCard'
import type { WordRow, WordRelationshipRow } from '@/lib/supabase/types'
import { RelatedWords } from './RelatedWords'
import { Loader2, BookmarkPlus, BookmarkCheck, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Pinyin } from '@/components/ui/pinyin'

interface ArticleEntry {
  article_id: string
  context_sentence: string | null
  articles: { id: string; title: string | null; date_read: string; content: string } | null
}

interface LookupData {
  word: WordRow
  relationships: (WordRelationshipRow & { word_b: { id: string; hanzi: string } | null })[]
  learnedWords: string[]
  isSaved: boolean
  articleWords: ArticleEntry[]
}

interface Props {
  hanzi: string
  context: string
  articleId: string | null
}

function lookupFetcher({ hanzi, context }: { hanzi: string; context: string }) {
  return fetch('/api/words/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanzi, context }),
  }).then((r) => r.json())
}

export function WordCardPanel({ hanzi, context, articleId }: Props) {
  const { addSavedWord, savedWords } = useWordCardStore()
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const { data, isLoading, error } = useSWR<LookupData>(
    hanzi ? { url: '/api/words/lookup', hanzi, context } : null,
    lookupFetcher
  )

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
    <div>
      <div className="flex flex-col items-start justify-between gap-2 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-wider">{hanzi}</h2>
            {data?.word?.id && (
              <Link
                href={`/word/${data.word.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                title="查看详情"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
          {data?.word?.pinyin && (
            <p className="text-base text-muted-foreground">
              <Pinyin value={data.word.pinyin} />
            </p>
          )}
        </div>
        {data?.word && !isLoading && (
          <Button
            size="sm"
            variant={isSaved ? 'secondary' : 'default'}
            onClick={handleSave}
            disabled={isSaved || saving}
            className="shrink-0"
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

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">查询中…</span>
        </div>
      )}

      {error && <div className="py-8 text-center text-destructive">网络错误，请重试</div>}

      {data?.word && !isLoading && (
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

          {data.articleWords.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">文章</h3>
              <div className="space-y-2">
                {data.articleWords.map((aw) => {
                  const art = aw.articles
                  if (!art) return null
                  return (
                    <Link key={aw.article_id} href={`/articles/${aw.article_id}`}>
                      <div className="rounded-lg border bg-background px-3 py-2.5 hover:border-primary/50 transition-colors">
                        <p className="text-sm font-medium line-clamp-1">
                          {art.title ?? art.content.slice(0, 20) + '…'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(art.date_read).toLocaleDateString('zh-CN')}
                        </p>
                        {aw.context_sentence && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 border-t pt-1">
                            …{aw.context_sentence}…
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
