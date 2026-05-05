'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { ReviewSession } from '@/components/flashcard/ReviewSession'
import { Brain } from 'lucide-react'
import { PageSpinner } from '@/components/ui/page-spinner'

interface DueWord {
  id: string
  word_id: string
  status: string
  review_count: number
  words: { hanzi: string; pinyin: string; definition: string } | null
}

export default function ReviewPage() {
  const { data, isLoading } = useSWR<{ dueWords: DueWord[] }>('/api/review/due', fetcher)

  if (isLoading) return <PageSpinner />

  const dueWords = data?.dueWords ?? []

  return (
    <div className="max-w-lg mx-auto p-4 md:p-6">
      <h1 className="text-xl font-bold mb-1">复习</h1>

      {dueWords.length === 0 ? (
        <div className="text-center py-20">
          <Brain className="h-14 w-14 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-semibold text-green-700">太棒了！今天没有需要复习的词</p>
          <p className="text-sm text-muted-foreground mt-2">保持每天学习，明天再来吧！</p>
        </div>
      ) : (
        <ReviewSession initialWords={dueWords.map((uw) => ({
          userWordId: uw.id,
          wordId: uw.word_id,
          hanzi: uw.words?.hanzi ?? '',
          pinyin: uw.words?.pinyin ?? '',
          definition: uw.words?.definition ?? '',
          status: uw.status,
          reviewCount: uw.review_count,
        }))} />
      )}
    </div>
  )
}
