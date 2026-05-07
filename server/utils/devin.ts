import { createHash } from 'node:crypto'

import type { ChatCompletionsRequest } from './openai'
import { stripSystemPromptEcho } from './openai'

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

// Known Devin billing/quota error strings returned in the response body
const QUOTA_STRINGS = [
  'no_quota_allocation',
  'out_of_quota',
  'out_of_credits',
  'usage_limit_exceeded',
  'org_usage_limit_exceeded',
  'total_session_limit_exceeded',
  'payment_declined',
  'billing error',
  'quota',
  'exhaust'
]

function looksQuotaError(error: DevinApiError) {
  const serialized = serializeErrorPayload(error.payload)?.toLowerCase() ?? ''
  return QUOTA_STRINGS.some(s => serialized.includes(s))
}

function looksInvalidKey(error: DevinApiError) {
  // 401 = token is genuinely invalid or revoked → mark invalid permanently
  // 403 = token is valid but wrong org ID or insufficient permissions →
  //       do NOT permanently mark invalid; fall through to rate-limit so the
  //       user can diagnose via the Check button and fix the org ID / role.
  return error.statusCode === 401
}

function looksForbidden(error: DevinApiError) {
  return error.statusCode === 403
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

function isTerminalStatus(status: string | null, statusDetail: string | null = null) {
  if (['error', 'failed', 'stopped', 'suspended', 'finished', 'exit'].includes(status ?? '')) {
    return true
  }
  // v3: status "running" with status_detail "finished" means Devin has completed the task
  if (status === 'running' && statusDetail === 'finished') {
    return true
  }
  return false
}

// v3 status_detail values that indicate the org/key has run out of quota or credits
const EXHAUSTION_DETAILS = new Set([
  'out_of_credits',
  'out_of_quota',
  'no_quota_allocation',
  'payment_declined',
  'usage_limit_exceeded',
  'org_usage_limit_exceeded',
  'total_session_limit_exceeded'
])

function getTerminalProxyStatus(status: string | null, statusDetail: string | null = null) {
  // v3: running + finished detail = successful completion
  if (status === 'running' && statusDetail === 'finished') {
    return 'finished' as const
  }
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
  // v3 API returns { items: [...] }; legacy shape used { messages: [...] }
  const messages = Array.isArray(objectPayload?.items)
    ? objectPayload.items
    : Array.isArray(objectPayload?.messages)
      ? objectPayload.messages
      : Array.isArray(payload)
        ? payload
        : []

  return messages.flatMap((message) => {
    const objectMessage = asObject(message)
    if (!objectMessage) {
      return []
    }

    // v3 uses `source` ("devin" | "user"); legacy used `sender`/`role`/`author`
    const sender = asString(objectMessage.source) ?? asString(objectMessage.sender) ?? asString(objectMessage.role) ?? asString(objectMessage.author)
    if (sender === 'user' || sender === 'system') {
      return []
    }

    const content = extractReadableText(objectMessage.content ?? objectMessage.text ?? objectMessage.message)
    if (!content) {
      return []
    }

    // v3 uses `event_id`; legacy used `id`
    const externalId = asString(objectMessage.event_id) ?? asString(objectMessage.id)
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

// ── API helpers ─────────────────────────────────────────────────────────────

async function devinFetch(base: string, path: string, init: RequestInit) {
  const response = await fetch(`${base}${path}`, init)
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

function getApiBase() {
  const runtimeConfig = useRuntimeConfig()
  return runtimeConfig.devinProxy.devinApiBase // e.g. https://api.devin.ai/v3
}

function getV1Base() {
  // Derive v1 base from the configured v3 base by swapping the version segment
  return getApiBase().replace(/\/v\d+\/?$/, '/v1').replace(/\/$/, '')
}

// true = use v1 personal key API; false = use v3 org service-user API
function isV1Key(key: ApiKeyRecord) {
  return !key.orgId || key.orgId.trim() === ''
}

// ── V3 (service user, org-scoped) ───────────────────────────────────────────

async function createDevinSessionV3(key: ApiKeyRecord, prompt: string) {
  return devinFetch(getApiBase(), `/organizations/${key.orgId}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }) as Promise<DevinSessionResponse>
}

async function fetchDevinSessionV3(key: ApiKeyRecord, devinSessionId: string) {
  return devinFetch(getApiBase(), `/organizations/${key.orgId}/sessions/${devinSessionId}`, {
    headers: { Authorization: `Bearer ${key.apiKey}` }
  })
}

async function fetchDevinMessagesV3(key: ApiKeyRecord, devinSessionId: string) {
  return devinFetch(getApiBase(), `/organizations/${key.orgId}/sessions/${devinSessionId}/messages`, {
    headers: { Authorization: `Bearer ${key.apiKey}` }
  })
}

// ── V1 (personal key, no org) ────────────────────────────────────────────────

async function createDevinSessionV1(key: ApiKeyRecord, prompt: string) {
  return devinFetch(getV1Base(), '/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  }) as Promise<DevinSessionResponse>
}

async function fetchDevinSessionV1(key: ApiKeyRecord, devinSessionId: string) {
  // v1 GET session embeds messages inline — no separate messages endpoint
  return devinFetch(getV1Base(), `/sessions/${devinSessionId}`, {
    headers: { Authorization: `Bearer ${key.apiKey}` }
  })
}

// ── Status helpers for v1 ────────────────────────────────────────────────────

// v1 status_enum values
const V1_TERMINAL = new Set(['finished', 'blocked', 'expired', 'suspend_requested', 'suspend_requested_frontend'])

function getProxyStatusV1(statusEnum: string | null): 'running' | 'finished' | 'stopped' | 'error' {
  switch (statusEnum) {
    case 'finished': return 'finished'
    case 'blocked':
    case 'expired':
    case 'suspend_requested':
    case 'suspend_requested_frontend': return 'stopped'
    default: return 'running'
  }
}

// ── Session creation (version-agnostic) ─────────────────────────────────────

async function createDevinSession(prompt: string) {
  const runtimeConfig = useRuntimeConfig()
  const cooldownMs = runtimeConfig.devinProxy.rateLimitCooldownMs

  for (const key of await listCandidateApiKeys()) {
    try {
      const payload = isV1Key(key)
        ? await createDevinSessionV1(key, prompt)
        : await createDevinSessionV3(key, prompt)

      await markApiKeyUsed(key.id)
      return { key, payload }
    } catch (error) {
      if (!(error instanceof DevinApiError)) {
        throw error
      }

      if (looksInvalidKey(error)) {
        await markApiKeyInvalid(key.id, error.message)
        continue
      }

      // Check quota/billing BEFORE the generic 403 handler — Devin returns 403
      // for no_quota_allocation, out_of_credits, billing errors, etc.
      if (looksQuotaError(error)) {
        await markApiKeyExhausted(
          key.id,
          `Billing/quota error — your organization has no session quota allocated. Check your Devin billing. Raw: ${error.message}`
        )
        continue
      }

      if (looksRateLimited(error)) {
        await markApiKeyRateLimited(key.id, error.message, cooldownMs)
        continue
      }

      if (looksForbidden(error)) {
        // 403 that is NOT a billing error = wrong org ID or missing ManageOrgSessions permission.
        // Rate-limit (not invalidate) so the user can diagnose via the Check button.
        await markApiKeyRateLimited(
          key.id,
          `Forbidden (403) — wrong organization ID or service user lacks ManageOrgSessions permission. Use the Check button to diagnose. Raw: ${error.message}`,
          cooldownMs
        )
        continue
      }

      await markApiKeyRateLimited(key.id, error.message, cooldownMs)
    }
  }

  throw new Error('No usable Devin API keys are currently available. Add a valid key or wait for cooldown to expire.')
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

  const v1 = isV1Key(created.key)

  while (!options.isAborted()) {
    // ── Fetch session state ──────────────────────────────────────────────────
    // v1: single request, messages are embedded in session payload
    // v3: two parallel requests (session status + messages list)
    let sessionPayload: unknown
    let messagesPayload: unknown

    if (v1) {
      sessionPayload = await fetchDevinSessionV1(created.key, devinSessionId)
      messagesPayload = sessionPayload // messages are inside the session response
    } else {
      ;[sessionPayload, messagesPayload] = await Promise.all([
        fetchDevinSessionV3(created.key, devinSessionId),
        fetchDevinMessagesV3(created.key, devinSessionId).catch(() => ({ items: [] }))
      ])
    }

    const sessionObject = asObject(sessionPayload)

    // ── Determine status ─────────────────────────────────────────────────────
    let proxyStatus: 'running' | 'finished' | 'stopped' | 'error'
    let terminal: boolean
    let statusLabel: string
    let finalStatus: 'finished' | 'stopped' | 'error'

    if (v1) {
      const statusEnum = asString(sessionObject?.status_enum)
      proxyStatus = getProxyStatusV1(statusEnum)
      terminal = V1_TERMINAL.has(statusEnum ?? '')
      statusLabel = statusEnum ?? asString(sessionObject?.status) ?? ''
      finalStatus = proxyStatus === 'running' ? 'stopped' : proxyStatus
    } else {
      const currentStatus = asString(sessionObject?.status)
      const currentStatusDetail = asString(sessionObject?.status_detail)
      proxyStatus = getProxyStatus(currentStatus)
      terminal = isTerminalStatus(currentStatus, currentStatusDetail)
      statusLabel = currentStatusDetail
        ? `${currentStatus ?? ''}:${currentStatusDetail}`
        : (currentStatus ?? '')
      finalStatus = getTerminalProxyStatus(currentStatus, currentStatusDetail)

      // Mark key exhausted if session suspended due to quota/billing
      if (currentStatus === 'suspended' && currentStatusDetail && EXHAUSTION_DETAILS.has(currentStatusDetail)) {
        await markApiKeyExhausted(created.key.id, `Session suspended: ${currentStatusDetail}`)
      }
    }

    await updateSessionProgress({
      sessionId,
      status: proxyStatus,
      rawLatestPayload: sessionObject,
      completed: terminal
    })

    if (statusLabel && statusLabel !== lastStatus) {
      await appendSessionEvent({
        sessionId,
        sequence,
        eventType: 'status',
        summary: statusLabel,
        payload: sessionObject
      })
      sequence += 1
      lastStatus = statusLabel
    }

    // ── Process events ───────────────────────────────────────────────────────
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

      // Strip system-prompt echo that Devin occasionally outputs as its first
      // message (it repeats back the compiled prompt verbatim).
      const emitText = outputParts.length === 0
        ? stripSystemPromptEcho(event.text, options.prompt)
        : event.text

      outputParts.push(emitText)
      if (emitText) {
        await options.onDelta(emitText)
      }
    }

    if (terminal) {
      return {
        sessionId,
        finalStatus,
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
