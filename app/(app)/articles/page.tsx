'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { fetcher } from '@/lib/fetcher'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, Search, X, Loader2 } from 'lucide-react'
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

  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const hasMore = total === null || articles.length < total

  const loadPage = useCallback(async (pageNum: number, q: string, replace: boolean) => {
    if (replace) {
      setIsLoading(true)
      setArticles([])
      setTotal(null)
    } else {
      setIsLoadingMore(true)
    }

    const url = q.trim()
      ? `/api/articles?q=${encodeURIComponent(q.trim())}`
      : `/api/articles?page=${pageNum}`

    try {
      const data = await fetcher(url) as { articles: Article[]; total: number }
      setArticles(prev => replace ? data.articles : [...prev, ...data.articles])
      setTotal(data.total)
      setPage(pageNum)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // Load first page whenever query changes
  useEffect(() => {
    queueMicrotask(() => loadPage(1, query, true))
  }, [query, loadPage])

  // Intersection Observer for infinite scroll (only when not searching)
  useEffect(() => {
    if (query.trim()) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadPage(page + 1, '', false)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [query, hasMore, isLoadingMore, isLoading, page, loadPage])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setQuery(search)
  }

  function handleClear() {
    setSearch('')
    setQuery('')
    inputRef.current?.focus()
  }

  // Group by created_at date when not searching
  const grouped: Record<string, Article[]> = {}
  if (!query.trim()) {
    for (const article of articles) {
      const date = article.created_at.slice(0, 10)
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
          搜索「{query}」，找到 {total ?? 0} 篇文章
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
                {new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
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

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} />

          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasMore && articles.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              已显示全部 {total} 篇文章
            </p>
          )}
        </div>
      )}
    </div>
  )
}
