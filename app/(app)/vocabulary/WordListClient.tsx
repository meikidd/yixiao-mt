'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useWordCardStore } from '@/store/wordCard'
import { Pinyin } from '@/components/ui/pinyin'
import { Search, Trash2 } from 'lucide-react'

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

const STATUS_CYCLE: Record<string, string> = {
  new: 'learning',
  learning: 'reviewing',
  reviewing: 'mastered',
  mastered: 'new',
}

export function WordListClient({ words: initialWords, statusLabels, statusColors }: Props) {
  const { openWord } = useWordCardStore()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [words, setWords] = useState(initialWords)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const filtered = words.filter((w) => {
    if (filter !== 'all' && w.status !== filter) return false
    if (search && !w.word?.hanzi.includes(search) && !w.word?.pinyin.includes(search)) return false
    return true
  })

  async function handleStatusCycle(e: React.MouseEvent, uw: WordEntry) {
    e.stopPropagation()
    const next = STATUS_CYCLE[uw.status] ?? 'new'
    setWords((prev) => prev.map((w) => w.id === uw.id ? { ...w, status: next } : w))
    await fetch(`/api/user-words/${uw.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  async function handleDelete(e: React.MouseEvent, uw: WordEntry) {
    e.stopPropagation()
    if (!confirm(`从词汇表删除「${uw.word?.hanzi}」？`)) return
    setPendingIds((prev) => new Set([...prev, uw.id]))
    const res = await fetch(`/api/user-words/${uw.id}`, { method: 'DELETE' })
    if (res.ok) {
      setWords((prev) => prev.filter((w) => w.id !== uw.id))
    }
    setPendingIds((prev) => { const n = new Set(prev); n.delete(uw.id); return n })
  }

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
        {(['all', 'learning', 'reviewing'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted'
            }`}
          >
            {s === 'all' ? `全部 (${words.length})` : `${statusLabels[s]} (${words.filter((w) => w.status === s).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-10 text-sm">没有找到匹配的词</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((uw) => {
          if (!uw.word) return null
          const isPending = pendingIds.has(uw.id)
          return (
            <Card
              key={uw.id}
              className={`cursor-pointer hover:border-primary transition-all active:scale-95 ${isPending ? 'opacity-40 pointer-events-none' : ''}`}
              onClick={() => openWord(uw.word!.hanzi)}
            >
              <CardContent className="p-3">
                {/* Top row: hanzi + delete */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-lg font-bold leading-tight">{uw.word.hanzi}</span>
                  <button
                    onClick={(e) => handleDelete(e, uw)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors shrink-0"
                    title="从词汇表删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Pinyin */}
                {uw.word.pinyin && (
                  <Pinyin value={uw.word.pinyin} className="text-xs text-muted-foreground" />
                )}

                {/* Definition */}
                {uw.word.definition && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{uw.word.definition}</p>
                )}

                {/* Status badge — click to cycle */}
                <button
                  onClick={(e) => handleStatusCycle(e, uw)}
                  className={`mt-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-opacity hover:opacity-70 ${statusColors[uw.status] ?? ''}`}
                  title="点击切换学习状态"
                >
                  {statusLabels[uw.status] ?? uw.status}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
