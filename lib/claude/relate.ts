import { getAnthropicClient, MODEL } from './client'
import type { RelationType } from '@/lib/supabase/types'

export interface WordRelation {
  word: string
  relation_type: RelationType
  explanation: string
}

const RELATE_TOOL = {
  name: 'find_relations',
  description: '找出新词与已学词汇的语义关联',
  input_schema: {
    type: 'object' as const,
    properties: {
      relations: {
        type: 'array',
        description: '有实际语义关联的词列表，无关联则为空数组',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string', description: '已学词' },
            relation_type: {
              type: 'string',
              enum: ['antonym', 'synonym', 'same_char', 'related'],
              description: 'antonym反义词 synonym近义词 same_char含相同汉字 related语义相关',
            },
            explanation: { type: 'string', description: '一句话说明关联' },
          },
          required: ['word', 'relation_type', 'explanation'] as string[],
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
  const userMsg = `已学词汇：${wordList}\n\n新词：${newWord}\n\n请找出新词与已学词汇中有实际语义关联的词。`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: '你是华语词汇关联分析助手。调用 find_relations 工具返回结果。',
    tools: [RELATE_TOOL],
    tool_choice: { type: 'tool', name: 'find_relations' },
    messages: [{ role: 'user', content: userMsg }],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') return []

  const input = toolUse.input as { relations: WordRelation[] }
  return input.relations ?? []
}
