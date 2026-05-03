import { getAnthropicClient, MODEL } from './client'
import { OCR_SYSTEM_PROMPT } from './prompts'

export interface OcrAnnotatedWord {
  text: string
  type: 'underline' | 'circle'
}

export interface OcrHandwrittenNote {
  near_text: string
  note: string
}

export interface OcrResult {
  title: string | null
  layout: 'single_column' | 'double_column' | 'two_pages' | 'partial'
  content: string
  annotated_words: OcrAnnotatedWord[]
  handwritten_notes: OcrHandwrittenNote[]
}

export async function extractTextFromImage(imageBase64: string, mediaType: string): Promise<OcrResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: OCR_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: '请分析这张书页图片，提取文章内容和用户批注。',
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('OCR 返回格式错误')
  }

  return JSON.parse(jsonMatch[0]) as OcrResult
}
