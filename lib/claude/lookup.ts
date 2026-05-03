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

const LOOKUP_TOOL = {
  name: 'define_word',
  description: '提供词语的详细释义',
  input_schema: {
    type: 'object' as const,
    properties: {
      pinyin: { type: 'string', description: '拼音（新加坡MOE标准，音调用数字，如 mao2 sheng4）' },
      part_of_speech: { type: 'string', description: '词性（名词/动词/形容词/副词/量词等）' },
      definition: { type: 'string', description: '释义（50字以内，用小学生能懂的语言）' },
      example_sentences: {
        type: 'array',
        description: '2个例句，小学课文程度',
        items: {
          type: 'object',
          properties: { sentence: { type: 'string' } },
          required: ['sentence'] as string[],
        },
      },
      usage_notes: { type: 'string', description: '用法说明和常见搭配，无则为空字符串' },
      related_suggestions: { type: 'array', items: { type: 'string' }, description: '3个相关词' },
    },
    required: ['pinyin', 'part_of_speech', 'definition', 'example_sentences', 'usage_notes', 'related_suggestions'] as string[],
  },
}

export async function lookupWord(hanzi: string, context = ''): Promise<WordLookupResult> {
  const client = getAnthropicClient()

  const userMsg = context
    ? `请解释词语：${hanzi}\n上下文：${context}`
    : `请解释词语：${hanzi}`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: '你是新加坡小学华语教师助手。请用小学四年级学生能理解的中文解释词语，调用 define_word 工具返回结果。',
    tools: [LOOKUP_TOOL],
    tool_choice: { type: 'tool', name: 'define_word' },
    messages: [{ role: 'user', content: userMsg }],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('字词查询未返回工具调用结果')
  }

  const input = toolUse.input as WordLookupResult & { usage_notes?: string }
  return {
    pinyin: input.pinyin,
    part_of_speech: input.part_of_speech,
    definition: input.definition,
    example_sentences: input.example_sentences ?? [],
    usage_notes: input.usage_notes || null,
    related_suggestions: input.related_suggestions ?? [],
  }
}
