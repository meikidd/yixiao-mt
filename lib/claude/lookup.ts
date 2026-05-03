import { getAnthropicClient, MODEL } from './client'
import { buildWordLookupPrompt } from './prompts'
import type { ExampleSentence } from '@/lib/supabase/types'

export interface WordLookupResult {
  pinyin: string
  part_of_speech: string
  definition: string
  example_sentences: ExampleSentence[]
  usage_notes: string | null
  related_suggestions: string[]
}

export async function lookupWord(hanzi: string, context = ''): Promise<WordLookupResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildWordLookupPrompt(hanzi, context),
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('字词查询返回格式错误')
  }

  return JSON.parse(jsonMatch[0]) as WordLookupResult
}
