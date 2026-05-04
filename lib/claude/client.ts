import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropicClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

export const MODEL = 'claude-sonnet-4-6'
// Cheaper model for simple NLP tasks (synonym/antonym lookup, etc.)
export const CHEAP_MODEL = 'claude-haiku-4-5'
