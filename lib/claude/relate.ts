import { getAnthropicClient, MODEL } from './client'
import { buildRelatePrompt } from './prompts'
import type { RelationType } from '@/lib/supabase/types'

export interface WordRelation {
  word: string
  relation_type: RelationType
  explanation: string
}

export async function findRelatedWords(newWord: string, learnedWords: string[]): Promise<WordRelation[]> {
  if (learnedWords.length === 0) return []

  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: buildRelatePrompt(newWord, learnedWords),
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0]) as WordRelation[]
  } catch {
    return []
  }
}
