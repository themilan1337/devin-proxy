import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import type { OpenAIChatMessage, OpenAIMessageContentPart, ProxySessionStatus } from '../../shared/types'

const openAIContentPartSchema = z.object({
  type: z.string(),
  text: z.string().optional()
}).passthrough()

const openAIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool', 'developer']),
  content: z.union([z.string(), z.array(openAIContentPartSchema)]),
  name: z.string().optional(),
  tool_call_id: z.string().optional()
}).passthrough()

export const chatCompletionsRequestSchema = z.object({
  model: z.string().default('devin-proxy-hub'),
  messages: z.array(openAIMessageSchema).min(1, 'At least one message is required.'),
  stream: z.boolean().default(true),
  temperature: z.number().optional(),
  user: z.string().optional()
}).passthrough()

export type ChatCompletionsRequest = z.infer<typeof chatCompletionsRequestSchema>

function extractTextFromContent(content: string | OpenAIMessageContentPart[]) {
  if (typeof content === 'string') {
    return content.trim()
  }

  return content
    .map(part => part.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')
}

export function compileDevinPrompt(messages: OpenAIChatMessage[]) {
  const sections = messages
    .map((message, index) => {
      const text = extractTextFromContent(message.content)

      return `Message ${index + 1}\nRole: ${message.role}${message.name ? ` (${message.name})` : ''}\n${text || '[no text content]'}`
    })
    .join('\n\n')

  return [
    'You are operating behind an OpenAI-compatible proxy that forwards a chat conversation into a single Devin autonomous session.',
    'Use the conversation transcript below as the complete source of truth.',
    'Continue the task autonomously, and respond with useful progress or final output as you work.',
    '',
    sections
  ].join('\n')
}

const SYSTEM_PROMPT_HEADER = 'You are operating behind an OpenAI-compatible proxy'

/**
 * Devin sometimes echoes the compiled system prompt verbatim as its first
 * output message. Strip that echo so only the actual response is surfaced.
 *
 * Strategy:
 *  1. Exact-match: if the response starts with the exact prompt we sent, trim it.
 *  2. Line-by-line: skip lines that are part of our known prompt structure
 *     (header sentences, blank lines, "Message N", "Role: X", transcript content).
 */
export function stripSystemPromptEcho(text: string, sentPrompt: string): string {
  if (!text.includes(SYSTEM_PROMPT_HEADER)) return text

  // Fast path – exact prefix match (most common case)
  const trimmedText = text.trimStart()
  const trimmedPrompt = sentPrompt.trim()
  if (trimmedText.startsWith(trimmedPrompt)) {
    return trimmedText.slice(trimmedPrompt.length).trim()
  }

  // Slow path – strip line by line when Devin reformats whitespace
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!.trim()
    if (
      line === '' ||
      line.startsWith('You are operating behind') ||
      line.startsWith('Use the conversation transcript') ||
      line.startsWith('Continue the task autonomously') ||
      /^Message\s+\d+$/.test(line) ||
      /^Role:\s/.test(line) ||
      // Content lines that appear verbatim inside the sent prompt (transcript body)
      (line.length > 0 && sentPrompt.includes(line))
    ) {
      i++
    } else {
      break
    }
  }

  return lines.slice(i).join('\n').trim()
}

export function buildPromptSnippet(prompt: string) {
  const compact = prompt.replace(/\s+/g, ' ').trim()
  return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact
}

export function createChatCompletionId() {
  return `chatcmpl-${randomUUID()}`
}

export function createChunk(options: {
  id: string
  model: string
  created: number
  content?: string
  role?: 'assistant'
  finishReason?: 'stop' | 'length'
}) {
  return {
    id: options.id,
    object: 'chat.completion.chunk',
    created: options.created,
    model: options.model,
    choices: [{
      index: 0,
      delta: {
        ...(options.role ? { role: options.role } : {}),
        ...(options.content ? { content: options.content } : {})
      },
      finish_reason: options.finishReason ?? null
    }]
  }
}

export function createCompletionResponse(options: {
  id: string
  model: string
  created: number
  content: string
  finishReason: 'stop' | 'length'
}) {
  return {
    id: options.id,
    object: 'chat.completion',
    created: options.created,
    model: options.model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: options.content
      },
      finish_reason: options.finishReason
    }],
    usage: null
  }
}

export function finishReasonFromStatus(status: ProxySessionStatus) {
  return status === 'finished' ? 'stop' : 'length'
}

export function createOpenAIErrorPayload(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected proxy error.'

  return {
    error: {
      message,
      type: 'proxy_error',
      code: 'devin_proxy_error'
    }
  }
}
