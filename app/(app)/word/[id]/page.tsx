export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ExampleSentence } from '@/lib/supabase/types'
import { Pinyin } from '@/components/ui/pinyin'

interface Props {
  params: Promise<{ id: string }>
}

const RELATION_COLORS: Record<string, string> = {
  synonym:   'bg-green-50  text-green-700  border-green-200',
  antonym:   'bg-red-50    text-red-700    border-red-200',
  same_char: 'bg-blue-50   text-blue-700   border-blue-200',
  related:   'bg-gray-50   text-gray-700   border-gray-200',
}

const RELATION_LABELS: Record<string, string> = {
  antonym:   '反义词',
  synonym:   '近义词',
  same_char: '同字词',
  related:   '相关词',
}

export default async function WordDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getSupabaseServerClient()

  const { data: word } = await supabase
    .from('words')
    .select('*')
    .eq('id', id)
    .single()

  if (!word) notFound()

  const [{ data: userWord }, { data: relRows }, { data: articlesWithWord }] = await Promise.all([
    supabase
      .from('user_words')
      .select('status')
      .eq('user_id', DEFAULT_USER_ID)
      .eq('word_id', id)
      .maybeSingle(),
    supabase
      .from('word_relationships')
      .select('relation_type, explanation, word_b_id')
      .eq('word_a_id', id),
    supabase
      .from('articles')
      .select('id, title, date_read, content')
      .ilike('content', `%${word.hanzi}%`)
      .limit(10),
  ])

  // Fetch related word details in one query (avoids embedded-join type ambiguity)
  const wordBIds = (relRows ?? []).map((r) => r.word_b_id).filter(Boolean)
  const { data: relatedWordRows } = wordBIds.length > 0
    ? await supabase.from('words').select('id, hanzi, pinyin').in('id', wordBIds)
    : { data: [] as { id: string; hanzi: string; pinyin: string }[] }

  const relatedWordsById = Object.fromEntries((relatedWordRows ?? []).map((w) => [w.id, w]))

  const relationships = (relRows ?? []).map((r) => ({
    relation_type: r.relation_type,
    explanation: r.explanation,
    word_b: relatedWordsById[r.word_b_id] ?? null,
  }))

  // Extract a context snippet around the first occurrence of the word
  const articleWords = (articlesWithWord ?? []).map((art) => {
    const idx = art.content.indexOf(word.hanzi)
    const contextSentence = idx === -1 ? null : art.content
      .slice(Math.max(0, idx - 15), idx + word.hanzi.length + 15)
      .replace(/\n/g, ' ')
    return { art, contextSentence }
  })

  const examples: ExampleSentence[] = !word.example_sentences
    ? []
    : Array.isArray(word.example_sentences)
    ? (word.example_sentences as ExampleSentence[])
    : typeof word.example_sentences === 'string'
    ? (() => { try { return JSON.parse(word.example_sentences) } catch { return [] } })()
    : []

  const grouped = relationships.reduce<Record<string, typeof relationships>>((acc, rel) => {
    if (!acc[rel.relation_type]) acc[rel.relation_type] = []
    acc[rel.relation_type].push(rel)
    return acc
  }, {})

  const STATUS_LABELS: Record<string, string> = {
    new: '新词', learning: '学习中', reviewing: '复习中', mastered: '已掌握',
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6">
      <Link
        href="/vocabulary"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        词汇表
      </Link>

      {/* Header */}
      <div className="flex flex-col items-start gap-3 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-wider">{word.hanzi}</h1>
            {userWord?.status && (
              <Badge variant="outline" className="mt-1 text-xs">
                {STATUS_LABELS[userWord.status] ?? userWord.status}
              </Badge>
            )}
          </div>
          {word.pinyin && (
            <p className="text-base text-muted-foreground mt-1">
              <Pinyin value={word.pinyin} />
            </p>
          )}
        </div>
        {word.part_of_speech && (
          <Badge variant="secondary">{word.part_of_speech}</Badge>
        )}
      </div>

      <div className="py-4 space-y-5">
        {/* Definition */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">释义</h3>
          <p className="text-base leading-relaxed">{word.definition}</p>
        </div>

        {/* Usage notes */}
        {word.usage_notes && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">用法</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{word.usage_notes}</p>
          </div>
        )}

        {/* Examples */}
        {examples.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">例句</h3>
            <ul className="space-y-2">
              {examples.map((ex, i) => (
                <li key={i} className="text-sm bg-muted rounded-lg px-3 py-2.5 leading-relaxed">
                  {ex.sentence}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Relationships */}
        {Object.keys(grouped).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">关联词</h3>
            <div className="space-y-2.5">
              {Object.entries(grouped).map(([type, rels]) => (
                <div key={type}>
                  <p className="text-xs text-muted-foreground mb-1.5">{RELATION_LABELS[type] ?? type}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rels?.map((rel) => {
                      const wb = rel.word_b
                      if (!wb) return null
                      const colorClass = RELATION_COLORS[type] ?? RELATION_COLORS.related
                      return (
                        <Link key={wb.id} href={`/word/${wb.id}`}>
                          <button className={`cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-opacity ${colorClass}`}>
                            {wb.hanzi}
                            {wb.pinyin && (
                              <span className="text-xs opacity-60">
                                <Pinyin value={wb.pinyin} />
                              </span>
                            )}
                          </button>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appeared in articles */}
        {articleWords.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">文章</h3>
            <div className="space-y-2">
              {articleWords.map(({ art, contextSentence }) => (
                  <Link key={art.id} href={`/articles/${art.id}`}>
                    <div className="rounded-lg border bg-background px-3 py-2.5 hover:border-primary transition-colors">
                      <p className="text-sm font-medium line-clamp-1">
                        {art.title ?? art.content.slice(0, 20) + '…'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(art.date_read).toLocaleDateString('zh-CN')}
                      </p>
                      {contextSentence && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 border-t pt-1">
                          …{contextSentence}…
                        </p>
                      )}
                    </div>
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
