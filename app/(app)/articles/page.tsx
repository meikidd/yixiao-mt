'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'
import { fetcher } from '@/lib/fetcher'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Search, X } from 'lucide-react'
import { useRef } from 'react'
import { PageSpinner } from '@/components/ui/page-spinner'

interface Article {
  id: string
  title: string | null
  content: string
  source: string | null
  date_read: string
  created_at: string
}

export default function ArticlesPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const url = query.trim()
    ? `/api/articles?q=${encodeURIComponent(query.trim())}`
    : '/api/articles'
  const { data, isLoading } = useSWR<{ articles: Article[] }>(url, fetcher)
  const articles = data?.articles ?? []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setQuery(search)
  }

  function handleClear() {
    setSearch('')
    setQuery('')
    inputRef.current?.focus()
  }

  // Group by date when not searching
  const grouped: Record<string, Article[]> = {}
  if (!query.trim()) {
    for (const article of articles) {
      const date = article.date_read
      if (!grouped[date]) grouped[date] = []
      grouped[date]!.push(article)
    }
  }

  const isSearching = Boolean(query.trim())

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">文章记录</h1>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索文章内容…"
          className="w-full h-9 pl-9 pr-9 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {isLoading && <PageSpinner />}

      {!isLoading && isSearching && (
        <p className="text-sm text-muted-foreground mb-4">
          搜索「{query}」，找到 {articles.length} 篇文章
        </p>
      )}

      {!isLoading && articles.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          {isSearching ? (
            <p>没有包含「{query}」的文章</p>
          ) : (
            <>
              <p>还没有文章记录</p>
              <p className="text-sm mt-1">拍照录入你读的第一篇文章吧！</p>
            </>
          )}
        </div>
      )}

      {!isLoading && isSearching && (
        <div className="flex flex-col gap-2">
          {articles.map((article) => {
            const idx = article.content.toLowerCase().indexOf(query.toLowerCase())
            const snippet = idx >= 0
              ? article.content.slice(Math.max(0, idx - 10), idx + 30)
              : article.content.slice(0, 40)
            return (
              <Link key={article.id} href={`/articles/${article.id}`} className="block">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <p className="font-medium line-clamp-1">
                      {article.title ?? article.content.slice(0, 30) + '…'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">…{snippet}…</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {!isLoading && !isSearching && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateArticles]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
              <div className="flex flex-col gap-2">
                {dateArticles.map((article) => (
                  <Link key={article.id} href={`/articles/${article.id}`} className="block">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <p className="font-medium line-clamp-1">
                          {article.title ?? article.content.slice(0, 30) + '…'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.content.slice(0, 80)}…
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
