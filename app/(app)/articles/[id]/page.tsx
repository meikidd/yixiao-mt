'use client'

import useSWR from 'swr'
import { use, useEffect } from 'react'
import { fetcher } from '@/lib/fetcher'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, StickyNote } from 'lucide-react'
import { PageSpinner } from '@/components/ui/page-spinner'
import Link from 'next/link'
import { ImageRowWithAppend } from './ImageRowWithAppend'
import { EditableContent } from './EditableContent'
import { ArticleWordsBadge } from './ArticleWordsBadge'
import { DeleteArticleButton } from './DeleteArticleButton'
import { ArticleWordSidebar } from '@/components/article-viewer/ArticleWordSidebar'
import { useWordCardStore } from '@/store/wordCard'
import { Pinyin } from '@/components/ui/pinyin'

interface Article {
  id: string
  title: string | null
  content: string
  date_read: string
  raw_image_urls: string[] | null
}

interface ArticleWord {
  annotation_note: string | null
  words: { hanzi: string; pinyin: string | null } | null
}

interface UserWord {
  words: { hanzi: string } | null
}

interface ArticleDetailData {
  article: Article
  articleWords: ArticleWord[]
  userWords: UserWord[]
}

interface Props {
  params: Promise<{ id: string }>
}

export default function ArticleDetailPage({ params }: Props) {
  const { id } = use(params)
  const { data, isLoading } = useSWR<ArticleDetailData>(`/api/articles/${id}`, fetcher)
  const { setSidebarMode, close } = useWordCardStore()

  // Enable sidebar mode on xl+ screens; close card and restore on unmount or resize
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const update = () => setSidebarMode(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => {
      mq.removeEventListener('change', update)
      setSidebarMode(false)
      close()
    }
  }, [setSidebarMode, close])

  if (isLoading) return <PageSpinner />

  if (!data?.article) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          文章列表
        </Link>
        <p className="text-muted-foreground">文章不存在</p>
      </div>
    )
  }

  const { article, articleWords, userWords } = data

  const userVocabSet = new Set(
    userWords.map((uw) => uw.words?.hanzi).filter(Boolean) as string[]
  )

  const vocabWords = articleWords
    .map((aw) => aw.words?.hanzi)
    .filter((h): h is string => !!h && userVocabSet.has(h))

  const vocabWordsFull = articleWords
    .filter((aw) => aw.words && userVocabSet.has(aw.words.hanzi))
    .map((aw) => ({ hanzi: aw.words!.hanzi, pinyin: aw.words!.pinyin }))

  const handwrittenNotes = articleWords
    .filter((aw) => aw.annotation_note)
    .map((aw) => ({ word: aw.words?.hanzi, note: aw.annotation_note }))

  const imageUrls = article.raw_image_urls ?? []

  return (
    <div className="p-4 md:p-6 xl:px-8 xl:py-6">
      {/* Nav row */}
      <div className="flex items-center justify-between mb-4 max-w-2xl xl:max-w-5xl xl:mx-auto">
        <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          文章列表
        </Link>
        <DeleteArticleButton articleId={id} />
      </div>

      {/* Content + sidebar */}
      <div className="max-w-2xl mx-auto xl:max-w-5xl xl:flex xl:gap-8 xl:items-start">

        {/* Article area */}
        <div className="flex-1 min-w-0">
          {/* Title & date */}
          <div className="mb-6">
            {article.title && <h1 className="text-2xl font-bold mb-1">{article.title}</h1>}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{new Date(article.date_read).toLocaleDateString('zh-CN')}</span>
              <ArticleWordsBadge words={vocabWordsFull} articleId={id} />
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

          {/* Article text */}
          <EditableContent articleId={id} content={article.content} vocabWords={vocabWords} />

          {/* Mobile vocab list — hidden on xl+ */}
          <div className="xl:hidden mt-8 border-t pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              本文词汇
            </p>
            {vocabWordsFull.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无词汇</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vocabWordsFull.map((w) => (
                  <MobileVocabChip key={w.hanzi} hanzi={w.hanzi} pinyin={w.pinyin} articleId={id} />
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="mt-8 border-t pt-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {imageUrls.length > 0 ? '原始图片' : '追加照片'}
            </p>
            <ImageRowWithAppend articleId={id} imageUrls={imageUrls} />
          </div>
        </div>

        {/* Desktop vocab/word sidebar — hidden below xl */}
        <aside className="hidden xl:block xl:self-stretch w-80 shrink-0">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl bg-muted border border-border p-4">
            <ArticleWordSidebar words={vocabWordsFull} articleId={id} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function MobileVocabChip({ hanzi, pinyin, articleId }: { hanzi: string; pinyin: string | null; articleId: string }) {
  const openWord = useWordCardStore((s) => s.openWord)
  return (
    <button
      onClick={() => openWord(hanzi, '', articleId)}
      className="flex flex-col items-center px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
    >
      <span className="text-base font-medium">{hanzi}</span>
      {pinyin && (
        <span className="text-[10px] text-muted-foreground mt-0.5">
          <Pinyin value={pinyin} />
        </span>
      )}
    </button>
  )
}
