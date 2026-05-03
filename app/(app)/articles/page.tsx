export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { getSupabaseServerClient, DEFAULT_USER_ID } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Camera, FileText } from 'lucide-react'

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

export default async function ArticlesPage() {
  const supabase = getSupabaseServerClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, content, source, date_read, created_at')
    .eq('user_id', DEFAULT_USER_ID)
    .order('date_read', { ascending: false })

  // Group by date
  const grouped: Record<string, typeof articles> = {}
  for (const article of articles ?? []) {
    const date = article.date_read
    if (!grouped[date]) grouped[date] = []
    grouped[date]!.push(article)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-5">文章记录</h1>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>还没有文章记录</p>
          <p className="text-sm mt-1">拍照录入你读的第一篇文章吧！</p>
        </div>
      )}

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
    </div>
  )
}
