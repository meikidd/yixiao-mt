export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ExampleSentence } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

const RELATION_LABELS: Record<string, string> = {
  antonym: '反义词',
  synonym: '近义词',
  same_char: '同字词',
  related: '相关词',
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

  const { data: userWord } = await supabase
    .from('user_words')
    .select('*')
    .eq('user_id', DEFAULT_USER_ID)
    .eq('word_id', id)
    .single()

  const { data: relationships } = await supabase
    .from('word_relationships')
    .select('*, word_b:words!word_relationships_word_b_id_fkey(id, hanzi, pinyin)')
    .eq('word_a_id', id)

  const { data: articleWords } = await supabase
    .from('article_words')
    .select('*, articles(id, title, date_read, content)')
    .eq('word_id', id)

  const examples = word.example_sentences
    ? (word.example_sentences as ExampleSentence[])
    : []

  const grouped = (relationships ?? []).reduce<Record<string, typeof relationships>>((acc, rel) => {
    if (!rel) return acc
    if (!acc[rel.relation_type]) acc[rel.relation_type] = []
    acc[rel.relation_type]!.push(rel)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/vocabulary" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        词汇表
      </Link>

      {/* Main word info */}
      <div>
        <div className="flex items-start gap-3">
          <h1 className="text-4xl font-bold">{word.hanzi}</h1>
          {userWord && (
            <Badge variant="outline" className="mt-2 text-xs">
              {userWord.status === 'mastered' ? '已掌握' :
               userWord.status === 'reviewing' ? '复习中' :
               userWord.status === 'learning' ? '学习中' : '新词'}
            </Badge>
          )}
        </div>
        {word.pinyin && <p className="text-lg text-muted-foreground mt-1">{word.pinyin}</p>}
        {word.part_of_speech && (
          <Badge variant="secondary" className="mt-2">{word.part_of_speech}</Badge>
        )}
      </div>

      {/* Definition */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">释义</h3>
          <p className="leading-relaxed">{word.definition}</p>
          {word.usage_notes && (
            <p className="text-sm text-muted-foreground mt-2 border-t pt-2">{word.usage_notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Examples */}
      {examples.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">例句</h3>
          <ul className="space-y-2">
            {examples.map((ex, i) => (
              <li key={i} className="bg-muted rounded-lg px-4 py-3 text-sm leading-relaxed">
                {ex.sentence}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Relationships */}
      {Object.keys(grouped).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">关联词</h3>
          <div className="space-y-3">
            {Object.entries(grouped).map(([type, rels]) => (
              <div key={type}>
                <p className="text-xs text-muted-foreground mb-1.5">{RELATION_LABELS[type] ?? type}</p>
                <div className="flex flex-wrap gap-2">
                  {rels?.map((rel) => {
                    const wb = rel?.word_b as { id: string; hanzi: string; pinyin: string } | null
                    if (!wb) return null
                    return (
                      <Link
                        key={wb.id}
                        href={`/word/${wb.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
                      >
                        {wb.hanzi}
                        {wb.pinyin && <span className="text-xs text-muted-foreground">{wb.pinyin}</span>}
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
      {articleWords && articleWords.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">出现在文章中</h3>
          <div className="space-y-2">
            {articleWords.map((aw) => {
              const art = aw.articles as { id: string; title: string | null; date_read: string; content: string } | null
              if (!art) return null
              return (
                <Link key={aw.article_id} href={`/articles/${aw.article_id}`}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-3">
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
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
