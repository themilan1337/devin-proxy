export type ApiKeyStatus = 'active' | 'rate_limited' | 'invalid' | 'disabled' | 'exhausted'

export type ProxySessionStatus = 'queued' | 'running' | 'finished' | 'stopped' | 'error'

export interface ApiKeyListItem {
  id: number
  name: string
  orgId: string
  maskedKey: string
  status: ApiKeyStatus
  orderIndex: number
  cooldownUntil: string | null
  lastError: string | null
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProxySessionListItem {
  id: number
  devinSessionId: string | null
  devinUrl: string | null
  status: ProxySessionStatus
  promptSnippet: string
  apiKeyName: string | null
  apiKeyMasked: string | null
  startedAt: string
  completedAt: string | null
  lastPolledAt: string | null
  lastError: string | null
  updatedAt: string
}

export interface SessionEventRecord {
  id: number
  sessionId: number
  sequence: number
  eventType: string
  summary: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface ProxySessionDetail extends ProxySessionListItem {
  originalPrompt: string
  clientIp: string | null
  rawLatestPayload: Record<string, unknown> | null
  events: SessionEventRecord[]
}

export interface OverviewStats {
  activeSessions: number
  totalSessions: number
  availableKeys: number
  rateLimitedKeys: number
}

export type OpenAIMessageRole = 'system' | 'user' | 'assistant' | 'tool' | 'developer'

export interface OpenAIMessageContentPart {
  type: string
  text?: string
}

export interface OpenAIChatMessage {
  role: OpenAIMessageRole
  content: string | OpenAIMessageContentPart[]
  name?: string
  tool_call_id?: string
}
