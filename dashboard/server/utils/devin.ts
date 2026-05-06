import { createHash } from 'node:crypto'

import type { ChatCompletionsRequest } from './openai'

import { listCandidateApiKeys, markApiKeyExhausted, markApiKeyInvalid, markApiKeyRateLimited, markApiKeyUsed } from './api-keys'
import { appendSessionEvent, attachDevinSession, createProxySession, updateSessionProgress } from './session-store'

export class DevinApiError extends Error {
  statusCode: number
  payload: unknown

  constructor(message: string, statusCode: number, payload: unknown) {
    super(message)
    this.name = 'DevinApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

interface DevinSessionResponse {
  session_id?: string
  url?: string
  status?: string
  [key: string]: unknown
}

interface NormalizedStreamEvent {
  uniqueId: string
  externalId: string | null
  eventType: string
  summary: string | null
  text: string
  payload: Record<string, unknown>
}

interface RunProxySessionOptions {
  request: ChatCompletionsRequest
  clientIp: string | null
  prompt: string
  promptSnippet: string
  onDelta: (content: string) => Promise<void> | void
  isAborted: () => boolean
}

interface RunProxySessionResult {
  sessionId: number
  finalStatus: 'finished' | 'stopped' | 'error'
  output: string
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function serializeErrorPayload(payload: unknown) {
  if (!payload) {
    return null
  }

  if (typeof payload === 'string') {
    return payload
  }

  try {
    return JSON.stringify(payload)
  } catch {
    return null
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const objectPayload = asObject(payload)
  if (!objectPayload) {
    return fallback
  }

  const directMessage = asString(objectPayload.message)
  if (directMessage) {
    return directMessage
  }

  const nestedError = asObject(objectPayload.error)
  return asString(nestedError?.message) ?? fallback
}

function looksRateLimited(error: DevinApiError) {
  if (error.statusCode === 429) {
    return true
  }

  const serialized = serializeErrorPayload(error.payload)?.toLowerCase() ?? ''
  return serialized.includes('rate limit')
}

function looksQuotaError(error: DevinApiError) {
  const serialized = serializeErrorPayload(error.payload)?.toLowerCase() ?? ''
  return serialized.includes('quota') || serialized.includes('exhaust')
}

function looksInvalidKey(error: DevinApiError) {
  return error.statusCode === 401 || error.statusCode === 403
}

function getProxyStatus(status: string | null) {
  switch (status) {
    case 'error':
    case 'failed':
      return 'error' as const
    case 'stopped':
    case 'suspended':
      return 'stopped' as const
    case 'finished':
    case 'exit':
      return 'finished' as const
    case 'running':
    case 'claimed':
    case 'resuming':
      return 'running' as const
    default:
      return 'running' as const
  }
}

function isTerminalStatus(status: string | null) {
  return ['error', 'failed', 'stopped', 'suspended', 'finished', 'exit'].includes(status ?? '')
}

function getTerminalProxyStatus(status: string | null) {
  const proxyStatus = getProxyStatus(status)
  return proxyStatus === 'running' ? 'stopped' : proxyStatus
}

function hashPayload(value: unknown) {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex')
}

function extractReadableText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (Array.isArray(value)) {
    return value.map(extractReadableText).filter(Boolean).join('\n').trim()
  }

  const objectValue = asObject(value)
  if (!objectValue) {
    return ''
  }

  const preferred = [objectValue.text, objectValue.content, objectValue.message, objectValue.output, objectValue.result]
    .map(extractReadableText)
    .find(Boolean)

  return preferred ?? ''
}

function normalizeMessages(payload: unknown) {
  const objectPayload = asObject(payload)
  const messages = Array.isArray(objectPayload?.messages)
    ? objectPayload.messages
    : Array.isArray(payload)
      ? payload
      : []

  return messages.flatMap((message) => {
    const objectMessage = asObject(message)
    if (!objectMessage) {
      return []
    }

    const sender = asString(objectMessage.sender) ?? asString(objectMessage.role) ?? asString(objectMessage.author)
    if (sender === 'user' || sender === 'system') {
      return []
    }

    const content = extractReadableText(objectMessage.content ?? objectMessage.text ?? objectMessage.message)
    if (!content) {
      return []
    }

    const externalId = asString(objectMessage.id)
    const uniqueId = externalId ?? hashPayload(objectMessage)

    return [{
      uniqueId,
      externalId,
      eventType: 'message',
      summary: content.slice(0, 120),
      text: `${content}\n`,
      payload: objectMessage
    } satisfies NormalizedStreamEvent]
  })
}

function normalizeStructuredEvents(payload: unknown) {
  const targetKeys = new Set(['events', 'steps', 'timeline', 'tool_calls', 'toolCalls', 'commands', 'shell_commands', 'shellCommands'])
  const discovered: NormalizedStreamEvent[] = []

  function visit(value: unknown) {
    const objectValue = asObject(value)
    if (!objectValue) {
      return
    }

    for (const [key, child] of Object.entries(objectValue)) {
      if (Array.isArray(child) && targetKeys.has(key)) {
        for (const entry of child) {
          const objectEntry = asObject(entry)
          if (!objectEntry) {
            continue
          }

          const command = asString(objectEntry.command) ?? asString(objectEntry.cmd)
          const output = extractReadableText(objectEntry.output ?? objectEntry.stdout ?? objectEntry.stderr ?? objectEntry.result)
          const toolName = asString(objectEntry.tool_name) ?? asString(objectEntry.toolName) ?? (key.includes('tool') ? asString(objectEntry.name) : null)
          const content = extractReadableText(objectEntry.content ?? objectEntry.text ?? objectEntry.message)

          let eventType = 'detail'
          let text = ''
          let summary: string | null = null

          if (command) {
            eventType = 'shell'
            text = output ? `$ ${command}\n${output}\n` : `$ ${command}\n`
            summary = command
          } else if (toolName) {
            eventType = 'tool'
            text = content ? `[tool:${toolName}] ${content}\n` : `[tool:${toolName}]\n`
            summary = toolName
          } else if (content) {
            eventType = key.replace(/s$/, '')
            text = `${content}\n`
            summary = content.slice(0, 120)
          }

          if (!text) {
            continue
          }

          const externalId = asString(objectEntry.id)
          discovered.push({
            uniqueId: externalId ?? hashPayload(objectEntry),
            externalId,
            eventType,
            summary,
            text,
            payload: objectEntry
          })
        }
      }

      if (child && typeof child === 'object') {
        visit(child)
      }
    }
  }

  visit(payload)
  return discovered
}

async function devinRequest(path: string, init: RequestInit) {
  const runtimeConfig = useRuntimeConfig()
  const response = await fetch(`${runtimeConfig.devinProxy.devinApiBase}${path}`, init)
  const text = await response.text()

  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }

  if (!response.ok) {
    throw new DevinApiError(extractErrorMessage(payload, `Devin API request failed with status ${response.status}.`), response.status, payload)
  }

  return payload
}

async function createDevinSession(prompt: string) {
  const runtimeConfig = useRuntimeConfig()
  const cooldownMs = runtimeConfig.devinProxy.rateLimitCooldownMs

  for (const key of await listCandidateApiKeys()) {
    try {
      const payload = await devinRequest(`/organizations/${key.orgId}/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      }) as DevinSessionResponse

      await markApiKeyUsed(key.id)
      return {
        key,
        payload
      }
    } catch (error) {
      if (!(error instanceof DevinApiError)) {
        throw error
      }

      if (looksInvalidKey(error)) {
        await markApiKeyInvalid(key.id, error.message)
        continue
      }

      if (looksQuotaError(error)) {
        await markApiKeyExhausted(key.id, error.message)
        continue
      }

      if (looksRateLimited(error)) {
        await markApiKeyRateLimited(key.id, error.message, cooldownMs)
        continue
      }

      await markApiKeyRateLimited(key.id, error.message, cooldownMs)
    }
  }

  throw new Error('No usable Devin API keys are currently available. Add a valid key or wait for cooldown to expire.')
}

async function fetchDevinSession(orgId: string, apiKey: string, devinSessionId: string) {
  return devinRequest(`/organizations/${orgId}/sessions/${devinSessionId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
}

async function fetchDevinMessages(orgId: string, apiKey: string, devinSessionId: string) {
  return devinRequest(`/organizations/${orgId}/sessions/${devinSessionId}/messages`, {
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
}

export async function runProxySession(options: RunProxySessionOptions): Promise<RunProxySessionResult> {
  const runtimeConfig = useRuntimeConfig()
  const pollIntervalMs = runtimeConfig.devinProxy.pollingIntervalMs
  const sessionId = await createProxySession({
    clientIp: options.clientIp,
    promptSnippet: options.promptSnippet,
    originalPrompt: options.prompt
  })

  let created: Awaited<ReturnType<typeof createDevinSession>>

  try {
    created = await createDevinSession(options.prompt)
  } catch (error) {
    await updateSessionProgress({
      sessionId,
      status: 'error',
      lastError: error instanceof Error ? error.message : 'Failed to create the upstream Devin session.',
      completed: true
    })

    throw error
  }

  const devinSessionId = asString(created.payload.session_id)
  if (!devinSessionId) {
    await updateSessionProgress({
      sessionId,
      status: 'error',
      lastError: 'Devin session creation did not return a session_id.',
      completed: true
    })
    throw new Error('Devin session creation did not return a session_id.')
  }

  await attachDevinSession({
    sessionId,
    apiKeyId: created.key.id,
    devinSessionId,
    devinUrl: asString(created.payload.url),
    status: getProxyStatus(asString(created.payload.status))
  })

  const seenIds = new Set<string>()
  const outputParts: string[] = []
  let sequence = 1
  let lastStatus: string | null = null

  while (!options.isAborted()) {
    const [sessionPayload, messagesPayload] = await Promise.all([
      fetchDevinSession(created.key.orgId, created.key.apiKey, devinSessionId),
      fetchDevinMessages(created.key.orgId, created.key.apiKey, devinSessionId).catch(() => ({ messages: [] }))
    ])

    const sessionObject = asObject(sessionPayload)
    const currentStatus = asString(sessionObject?.status)
    const proxyStatus = getProxyStatus(currentStatus)

    await updateSessionProgress({
      sessionId,
      status: proxyStatus,
      rawLatestPayload: sessionObject,
      completed: isTerminalStatus(currentStatus)
    })

    if (currentStatus && currentStatus !== lastStatus) {
      await appendSessionEvent({
        sessionId,
        sequence,
        eventType: 'status',
        summary: currentStatus,
        payload: sessionObject
      })
      sequence += 1
      lastStatus = currentStatus
    }

    const events = [
      ...normalizeMessages(messagesPayload),
      ...normalizeStructuredEvents(sessionPayload)
    ]

    for (const event of events) {
      if (seenIds.has(event.uniqueId)) {
        continue
      }

      seenIds.add(event.uniqueId)
      await appendSessionEvent({
        sessionId,
        sequence,
        externalId: event.externalId,
        eventType: event.eventType,
        summary: event.summary,
        payload: event.payload
      })
      sequence += 1

      outputParts.push(event.text)
      await options.onDelta(event.text)
    }

    if (isTerminalStatus(currentStatus)) {
      return {
        sessionId,
        finalStatus: getTerminalProxyStatus(currentStatus),
        output: outputParts.join('').trim()
      }
    }

    await sleep(pollIntervalMs)
  }

  await updateSessionProgress({
    sessionId,
    status: 'stopped',
    lastError: 'Client disconnected before the Devin session reached a terminal state.'
  })

  return {
    sessionId,
    finalStatus: 'stopped',
    output: outputParts.join('').trim()
  }
}

export function proxyTimestamp() {
  return nowSeconds()
}
