'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/fetcher'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Camera, BookOpen, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageSpinner } from '@/components/ui/page-spinner'

interface DashboardStats {
  recentArticles: { id: string; title: string | null; date_read: string; content: string }[]
  dueCount: number
  totalWords: number
  masteredWords: number
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<DashboardStats>('/api/dashboard/stats', fetcher)

  if (isLoading) return <PageSpinner />

  const { recentArticles = [], dueCount = 0, totalWords = 0, masteredWords = 0 } = data ?? {}

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">你好，一笑！</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-3">
          <p className="text-2xl font-bold text-primary">{totalWords}</p>
          <p className="text-xs text-muted-foreground mt-0.5">已学词汇</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-2xl font-bold text-green-600">{masteredWords}</p>
          <p className="text-xs text-muted-foreground mt-0.5">已掌握</p>
        </Card>
        <Card className={`text-center p-3 ${dueCount > 0 ? 'border-orange-300 bg-orange-50' : ''}`}>
          <p className={`text-2xl font-bold ${dueCount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {dueCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">待复习</p>
        </Card>
      </div>

      {/* Due review banner */}
      {dueCount > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-orange-800">有 {dueCount} 个词需要复习</p>
              <p className="text-sm text-orange-700">趁热打铁，复习一下吧！</p>
            </div>
            <Link
              href="/review"
              className={cn(buttonVariants({ size: 'sm' }), 'bg-orange-500 hover:bg-orange-600 text-white inline-flex items-center gap-1.5')}
            >
              <Brain className="h-4 w-4" />
              开始复习
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/upload"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-16 flex-col gap-1')}
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm">拍照录入</span>
        </Link>
        <Link
          href="/articles"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-16 flex-col gap-1')}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm">查看文章</span>
        </Link>
      </div>

      {/* Recent articles */}
      {recentArticles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">最近读过的文章</h2>
          <div className="flex flex-col gap-2">
            {recentArticles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <p className="font-medium line-clamp-1">
                      {article.title ?? article.content.slice(0, 20) + '…'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(article.date_read).toLocaleDateString('zh-CN')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
