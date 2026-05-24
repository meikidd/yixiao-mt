'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'
import { basePath } from '@/lib/base-path'
import { WordListClient } from './WordListClient'
import { PageSpinner } from '@/components/ui/page-spinner'
import { WordCardSidebar } from '@/components/word-card/WordCardSidebar'
import { useWordCardStore } from '@/store/wordCard'

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
  const { data: userWords, isLoading } = useSWR<UserWord[]>(`${basePath}/api/vocabulary`, fetcher)
  const { open, setSidebarMode, close } = useWordCardStore()

  // Enable sidebar mode on xl+ screens; close card and restore on unmount
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
    <div className="max-w-2xl mx-auto xl:max-w-5xl xl:flex xl:gap-8 xl:items-start p-4 md:p-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold mb-2">词汇表</h1>

        {/* Stats — hidden on xl because the sidebar already shows them */}
        <div className="xl:hidden flex gap-3 mb-5 flex-wrap">
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

      {/* Desktop sidebar */}
      <aside className="hidden xl:block xl:self-stretch w-80 shrink-0">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] flex flex-col gap-3">
          {/* Stats block */}
          <div className="rounded-xl bg-muted border border-border p-4 flex-none">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">学习概览</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">共 <strong className="text-foreground">{counts.total}</strong> 个词</span>
              <span className="text-green-600">已掌握 <strong>{counts.mastered}</strong></span>
              <span className="text-blue-600">学习中 <strong>{counts.learning}</strong></span>
              <span className="text-orange-600">复习中 <strong>{counts.reviewing}</strong></span>
            </div>
          </div>
          {/* Word card block — only rendered when a word is selected */}
          {open && (
            <div className="rounded-xl bg-muted border border-border p-4 overflow-y-auto">
              <WordCardSidebar />
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
