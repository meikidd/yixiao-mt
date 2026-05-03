export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Camera, FileText } from 'lucide-react'
import { ArticleSearch } from './ArticleSearch'

const SOURCE_ICON = {
  photo: Camera,
  manual: FileText,
  builtin: BookOpen,
}

const SOURCE_LABEL = {
  photo: '拍照',
  manual: '手动',
  builtin: '教材',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ArticlesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = getSupabaseServerClient()

  let query = supabase
    .from('articles')
    .select('id, title, content, source, date_read, created_at')
    .eq('user_id', DEFAULT_USER_ID)
    .order('date_read', { ascending: false })

  if (q && q.trim()) {
    query = query.ilike('content', `%${q.trim()}%`)
  }

  const { data: articles } = await query

  // Group by date only when not searching
  const grouped: Record<string, typeof articles> = {}
  for (const article of articles ?? []) {
    const date = article.date_read
    if (!grouped[date]) grouped[date] = []
    grouped[date]!.push(article)
  }

  const isSearching = Boolean(q?.trim())

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">文章记录</h1>
      </div>

      <ArticleSearch defaultValue={q ?? ''} />

      {isSearching && (
        <p className="text-sm text-muted-foreground mb-4">
          搜索「{q}」，找到 {articles?.length ?? 0} 篇文章
        </p>
      )}

      {(articles?.length ?? 0) === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          {isSearching ? (
            <p>没有包含「{q}」的文章</p>
          ) : (
            <>
              <p>还没有文章记录</p>
              <p className="text-sm mt-1">拍照录入你读的第一篇文章吧！</p>
            </>
          )}
        </div>
      )}

      {isSearching ? (
        <div className="space-y-2">
          {articles?.map((article) => {
            const Icon = SOURCE_ICON[article.source as keyof typeof SOURCE_ICON] ?? FileText
            const idx = article.content.toLowerCase().indexOf((q ?? '').toLowerCase())
            const snippet = idx >= 0
              ? article.content.slice(Math.max(0, idx - 10), idx + 30)
              : article.content.slice(0, 40)
            return (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium line-clamp-1">
                        {article.title ?? article.content.slice(0, 30) + '…'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">…{snippet}…</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {SOURCE_LABEL[article.source as keyof typeof SOURCE_LABEL] ?? article.source}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateArticles]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
              <div className="space-y-2">
                {dateArticles?.map((article) => {
                  const Icon = SOURCE_ICON[article.source as keyof typeof SOURCE_ICON] ?? FileText
                  return (
                    <Link key={article.id} href={`/articles/${article.id}`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium line-clamp-1">
                              {article.title ?? article.content.slice(0, 30) + '…'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {article.content.slice(0, 60)}…
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {SOURCE_LABEL[article.source as keyof typeof SOURCE_LABEL] ?? article.source}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
