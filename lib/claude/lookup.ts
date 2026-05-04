import { getAnthropicClient, MODEL } from './client'
import type { ExampleSentence } from '@/lib/supabase/types'

export interface WordLookupResult {
  pinyin: string
  part_of_speech: string
  definition: string
  example_sentences: ExampleSentence[]
  usage_notes: string | null
  related_suggestions: string[]
}

const LOOKUP_SCHEMA = {
  type: 'object' as const,
  properties: {
    pinyin: { type: 'string' as const },
    part_of_speech: { type: 'string' as const },
    definition: { type: 'string' as const },
    example_sentences: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: { sentence: { type: 'string' as const } },
        required: ['sentence'],
        additionalProperties: false,
      },
    },
    usage_notes: { type: 'string' as const },
    related_suggestions: {
      type: 'array' as const,
      items: { type: 'string' as const },
    },
  },
  required: ['pinyin', 'part_of_speech', 'definition', 'example_sentences', 'usage_notes', 'related_suggestions'],
  additionalProperties: false,
}

export async function lookupWord(hanzi: string, context = ''): Promise<WordLookupResult> {
  const client = getAnthropicClient()

  const userMsg = context
    ? `请解释词语：${hanzi}\n上下文：${context}`
    : `请解释词语：${hanzi}`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: '你是新加坡小学华语教师助手。请用小学四年级学生能理解的中文解释词语。拼音使用新加坡MOE标准（音调用数字，如 mao2 sheng4）。释义50字以内。例句2个，小学课文程度。usage_notes填常见搭配，无则填空字符串。related_suggestions填3个相关词。',
    output_config: { format: { type: 'json_schema', schema: LOOKUP_SCHEMA } },
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('字词查询未返回结果')

  const input = JSON.parse(text) as WordLookupResult & { usage_notes: string }
  return {
    pinyin: input.pinyin,
    part_of_speech: input.part_of_speech,
    definition: input.definition,
    example_sentences: input.example_sentences ?? [],
    usage_notes: input.usage_notes || null,
    related_suggestions: input.related_suggestions ?? [],
  }
}
