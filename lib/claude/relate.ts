import { getAnthropicClient, MODEL } from './client'
import type { RelationType } from '@/lib/supabase/types'

export interface WordRelation {
  word: string
  relation_type: RelationType
}

const RELATE_TOOL = {
  name: 'find_relations',
  description: '找出新词与已学词汇的语义关联（近义词、反义词、同字词、相关词）',
  input_schema: {
    type: 'object' as const,
    properties: {
      relations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            relation_type: {
              type: 'string',
              enum: ['antonym', 'synonym', 'same_char', 'related'],
            },
          },
          required: ['word', 'relation_type'] as string[],
        },
      },
    },
    required: ['relations'] as string[],
  },
}

export async function findRelatedWords(newWord: string, learnedWords: string[]): Promise<WordRelation[]> {
  if (learnedWords.length === 0) return []

  const client = getAnthropicClient()

  const wordList = learnedWords.slice(0, 200).join('、')
  const userMsg = `已学词汇：${wordList}\n\n新词：${newWord}\n\n请找出「${newWord}」与已学词汇中有语义关联的词（包括近义词、反义词、同字词、相关词）。`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: '你是新加坡小学华语词汇教学助手，负责分析词汇之间的语义关联。请调用 find_relations 工具返回结果。对于意思相近的词，即使用法略有差异，也应标记为近义词。',
    tools: [RELATE_TOOL],
    tool_choice: { type: 'tool', name: 'find_relations' },
    messages: [{ role: 'user', content: userMsg }],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return []

  const input = toolUse.input as { relations: WordRelation[] | string }
  let relations = input.relations

  // Claude occasionally wraps the array as a JSON-encoded string.
  // Without an explanation field there's nothing to cause unescaped quotes,
  // so JSON.parse should reliably succeed here.
  if (typeof relations === 'string') {
    try { relations = JSON.parse(relations) } catch { return [] }
  }

  return Array.isArray(relations) ? relations : []
}
