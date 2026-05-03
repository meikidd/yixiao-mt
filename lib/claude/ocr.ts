import { getAnthropicClient, MODEL } from './client'

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

const OCR_TOOL = {
  name: 'extract_article',
  description: '从书页图片中提取文章内容和用户批注',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: '文章标题，如果图片中没有标题则为空字符串',
      },
      layout: {
        type: 'string',
        enum: ['single_column', 'double_column', 'two_pages', 'partial'],
        description: '版面类型：单栏/双栏/两页/截断页',
      },
      content: {
        type: 'string',
        description: '文章正文全文。双栏排版先读左栏再读右栏，两页内容用换行加---加换行分隔。保留原始段落结构，段落之间用换行分隔。',
      },
      annotated_words: {
        type: 'array',
        description: '用户用铅笔/钢笔/荧光笔划线或圈出的词语',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '被标注的词语' },
            type: { type: 'string', enum: ['underline', 'circle'], description: '标注类型：下划线或圈' },
          },
          required: ['text', 'type'],
        },
      },
      handwritten_notes: {
        type: 'array',
        description: '用户在书页旁边写的手写笔记',
        items: {
          type: 'object',
          properties: {
            near_text: { type: 'string', description: '手写旁批附近的印刷文字（约5-10字），用于定位' },
            note: { type: 'string', description: '手写笔记的内容' },
          },
          required: ['near_text', 'note'],
        },
      },
    },
    required: ['title', 'layout', 'content', 'annotated_words', 'handwritten_notes'] as string[],
  },
}

const OCR_SYSTEM = '你是一个专业的中文书页识别助手。请调用 extract_article 工具提取图片中的内容。忽略页码、页眉和装饰图案。'

export async function extractTextFromImage(imageBase64: string, mediaType: string): Promise<OcrResult> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: OCR_SYSTEM,
    tools: [OCR_TOOL],
    tool_choice: { type: 'tool', name: 'extract_article' },
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
            text: '请提取这张书页图片中的文章内容和用户批注。',
          },
        ],
      },
    ],
  })

  // With tool_choice forced, the SDK guarantees a tool_use block with properly-encoded JSON
  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('OCR 未返回工具调用结果')
  }

  const input = toolUse.input as OcrResult & { title?: string }
  return {
    title: input.title || null,
    layout: input.layout,
    content: input.content,
    annotated_words: input.annotated_words ?? [],
    handwritten_notes: input.handwritten_notes ?? [],
  }
}
