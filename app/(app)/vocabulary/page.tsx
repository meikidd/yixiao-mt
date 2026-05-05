'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { WordListClient } from './WordListClient'
import { PageSpinner } from '@/components/ui/page-spinner'

const STATUS_LABEL = {
  new: '新词',
  learning: '学习中',
  reviewing: '复习中',
  mastered: '已掌握',
}

const STATUS_COLOR = {
  new: 'bg-gray-100 text-gray-700',
  learning: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-orange-100 text-orange-700',
  mastered: 'bg-green-100 text-green-700',
}

interface UserWord {
  id: string
  status: string
  first_seen_at: string
  words: {
    id: string
    hanzi: string
    pinyin: string
    definition: string
    part_of_speech: string | null
  } | null
}

export default function VocabularyPage() {
  const { data: userWords, isLoading } = useSWR<UserWord[]>('/api/vocabulary', fetcher)

  if (isLoading) return <PageSpinner />

  const words = (userWords ?? [])
    .map((uw) => ({ ...uw, word: uw.words }))
    .filter((uw) => uw.word)

  const counts = {
    total: words.length,
    mastered: words.filter((w) => w.status === 'mastered').length,
    learning: words.filter((w) => w.status === 'learning').length,
    reviewing: words.filter((w) => w.status === 'reviewing').length,
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-xl font-bold mb-2">词汇表</h1>

      {/* Stats */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <span className="text-sm text-muted-foreground">共 <strong>{counts.total}</strong> 个词</span>
        <span className="text-sm text-green-600">已掌握 <strong>{counts.mastered}</strong></span>
        <span className="text-sm text-blue-600">学习中 <strong>{counts.learning}</strong></span>
        <span className="text-sm text-orange-600">复习中 <strong>{counts.reviewing}</strong></span>
      </div>

      <WordListClient
        words={words}
        statusLabels={STATUS_LABEL}
        statusColors={STATUS_COLOR}
      />
    </div>
  )
}
