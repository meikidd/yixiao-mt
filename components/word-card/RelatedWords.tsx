'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { useWordCardStore } from '@/store/wordCard'
import type { RelationType } from '@/lib/supabase/types'

const RELATION_LABELS: Record<RelationType, string> = {
  antonym: '反义词',
  synonym: '近义词',
  same_char: '同字词',
  related: '相关词',
}

const RELATION_COLORS: Record<RelationType, string> = {
  antonym: 'bg-red-50 text-red-700 border-red-200',
  synonym: 'bg-green-50 text-green-700 border-green-200',
  same_char: 'bg-blue-50 text-blue-700 border-blue-200',
  related: 'bg-orange-50 text-orange-700 border-orange-200',
}

interface Relationship {
  relation_type: string
  explanation: string | null
  word_b: { id: string; hanzi: string } | null
}

interface Props {
  relationships: Relationship[]
  learnedWords: string[]
}

export function RelatedWords({ relationships, learnedWords }: Props) {
  const { openWord } = useWordCardStore()

  const grouped = relationships.reduce<Record<string, Relationship[]>>((acc, rel) => {
    if (!acc[rel.relation_type]) acc[rel.relation_type] = []
    acc[rel.relation_type].push(rel)
    return acc
  }, {})

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">关联词</h3>
      <div className="space-y-3">
        {Object.entries(grouped).map(([type, rels]) => (
          <div key={type}>
            <span className="text-xs text-muted-foreground mb-1.5 block">
              {RELATION_LABELS[type as RelationType] ?? type}
            </span>
            <div className="flex flex-wrap gap-2">
              {rels.map((rel) => {
                if (!rel.word_b) return null
                const isLearned = learnedWords.includes(rel.word_b.hanzi)
                return (
                  <button
                    key={rel.word_b.id}
                    onClick={() => openWord(rel.word_b!.hanzi)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-opacity ${
                      RELATION_COLORS[type as RelationType] ?? 'bg-muted'
                    } ${isLearned ? 'opacity-100' : 'opacity-60'}`}
                    title={rel.explanation ?? undefined}
                  >
                    {rel.word_b.hanzi}
                    {!isLearned && <span className="text-[10px] opacity-70">扩展</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
