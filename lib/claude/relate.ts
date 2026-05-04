import { getAnthropicClient, CHEAP_MODEL } from './client'
import type { RelationType } from '@/lib/supabase/types'

export interface WordRelation {
  word: string
  relation_type: RelationType
}

const RELATIONS_SCHEMA = {
  type: 'object' as const,
  properties: {
    relations: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          word: { type: 'string' as const },
          relation_type: {
            type: 'string' as const,
            enum: ['antonym', 'synonym', 'same_char', 'related'],
          },
        },
        required: ['word', 'relation_type'],
        additionalProperties: false,
      },
    },
  },
  required: ['relations'],
  additionalProperties: false,
}

export async function findRelatedWords(newWord: string, learnedWords: string[]): Promise<WordRelation[]> {
  if (learnedWords.length === 0) return []

  const client = getAnthropicClient()

  const wordList = learnedWords.slice(0, 200).join('、')
  const userMsg = `已学词汇：${wordList}\n\n新词：${newWord}\n\n请找出「${newWord}」与已学词汇中有语义关联的词（包括近义词、反义词、同字词、相关词）。无关联的词不要包含在结果中。`

  const response = await client.messages.create({
    model: CHEAP_MODEL,
    max_tokens: 1024,
    system: '你是新加坡小学华语词汇教学助手，负责分析词汇之间的语义关联。对于意思相近的词，即使用法略有差异，也应标记为近义词。',
    output_config: { format: { type: 'json_schema', schema: RELATIONS_SCHEMA } },
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) return []

  const parsed = JSON.parse(text) as { relations: WordRelation[] }
  return Array.isArray(parsed.relations) ? parsed.relations : []
}
