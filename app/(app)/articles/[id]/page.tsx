export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { ArticleText } from '@/components/article-viewer/ArticleText'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, StickyNote } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticleDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getSupabaseServerClient()

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('user_id', DEFAULT_USER_ID)
    .single() as { data: { id: string; title: string | null; content: string; date_read: string; raw_image_urls: string[] | null; source: string; notes: string | null } | null }

  if (!article) notFound()

  type AW = { is_annotated: boolean; annotation_note: string | null; annotation_type: string | null; words: { hanzi: string } | null }
  const { data: articleWords } = await supabase
    .from('article_words')
    .select('is_annotated, annotation_note, annotation_type, words(hanzi)')
    .eq('article_id', id) as { data: AW[] | null }

  const annotatedWords = (articleWords ?? [])
    .filter((aw) => aw.is_annotated)
    .map((aw) => aw.words?.hanzi)
    .filter(Boolean) as string[]

  const handwrittenNotes = (articleWords ?? [])
    .filter((aw) => aw.annotation_note)
    .map((aw) => ({ word: aw.words?.hanzi, note: aw.annotation_note }))

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        文章列表
      </Link>

      <div className="mb-6">
        {article.title && <h1 className="text-2xl font-bold mb-1">{article.title}</h1>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date(article.date_read).toLocaleDateString('zh-CN')}</span>
          {annotatedWords.length > 0 && (
            <Badge variant="secondary">{annotatedWords.length} 个标注词</Badge>
          )}
        </div>
      </div>

      {/* Handwritten notes */}
      {handwrittenNotes.length > 0 && (
        <Card className="mb-5 bg-yellow-50 border-yellow-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-yellow-800 uppercase tracking-wide">
              <StickyNote className="h-3.5 w-3.5" />
              旁批笔记
            </div>
            <ul className="space-y-1.5">
              {handwrittenNotes.map((n, i) => (
                <li key={i} className="text-sm text-yellow-900">
                  <span className="font-medium">{n.word}：</span>{n.note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Article text - click any char to look up */}
      <ArticleText
        content={article.content}
        annotatedWords={annotatedWords}
        articleId={id}
      />

      {/* Image(s) */}
      {article.raw_image_urls && article.raw_image_urls.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">原始图片</p>
          <div className="space-y-3">
            {article.raw_image_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`原图 ${i + 1}`}
                className="w-full rounded-lg border"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
