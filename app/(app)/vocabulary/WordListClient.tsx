'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWordCardStore } from '@/store/wordCard'
import { Search } from 'lucide-react'

interface WordEntry {
  id: string
  status: string
  first_seen_at: string
  word: {
    id: string
    hanzi: string
    pinyin: string
    definition: string
    part_of_speech: string | null
  } | null
}

interface Props {
  words: WordEntry[]
  statusLabels: Record<string, string>
  statusColors: Record<string, string>
}

type FilterStatus = 'all' | 'new' | 'learning' | 'reviewing' | 'mastered'

export function WordListClient({ words, statusLabels, statusColors }: Props) {
  const { openWord } = useWordCardStore()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  const filtered = words.filter((w) => {
    if (filter !== 'all' && w.status !== filter) return false
    if (search && !w.word?.hanzi.includes(search) && !w.word?.pinyin.includes(search)) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索词语…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'new', 'learning', 'reviewing', 'mastered'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s === 'all' ? '全部' : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Word list */}
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">没有找到匹配的词</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((uw) => {
          if (!uw.word) return null
          return (
            <Card
              key={uw.id}
              className="cursor-pointer hover:border-primary/50 transition-colors active:scale-95"
              onClick={() => openWord(uw.word!.hanzi)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-lg font-bold leading-tight">{uw.word.hanzi}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusColors[uw.status] ?? ''}`}>
                    {statusLabels[uw.status] ?? uw.status}
                  </span>
                </div>
                {uw.word.pinyin && (
                  <p className="text-xs text-muted-foreground mt-0.5">{uw.word.pinyin}</p>
                )}
                {uw.word.definition && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{uw.word.definition}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
