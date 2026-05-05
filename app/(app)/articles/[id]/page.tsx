'use client'

import useSWR from 'swr'
import { use } from 'react'
import { fetcher } from '@/lib/fetcher'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, StickyNote } from 'lucide-react'
import { PageSpinner } from '@/components/ui/page-spinner'
import Link from 'next/link'
import { ImageRowWithAppend } from './ImageRowWithAppend'
import { EditableContent } from './EditableContent'
import { ArticleWordsBadge } from './ArticleWordsBadge'
import { DeleteArticleButton } from './DeleteArticleButton'

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
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Link href="/articles" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          文章列表
        </Link>
        <DeleteArticleButton articleId={id} />
      </div>

      <div className="mb-6">
        {article.title && <h1 className="text-2xl font-bold mb-1">{article.title}</h1>}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date(article.date_read).toLocaleDateString('zh-CN')}</span>
          <ArticleWordsBadge words={vocabWordsFull} articleId={id} />
        </div>
      </div>

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

      <EditableContent articleId={id} content={article.content} vocabWords={vocabWords} />

      <div className="mt-8 border-t pt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {imageUrls.length > 0 ? '原始图片' : '追加照片'}
        </p>
        <ImageRowWithAppend articleId={id} imageUrls={imageUrls} />
      </div>
    </div>
  )
}
