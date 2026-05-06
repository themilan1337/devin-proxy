import { asc, desc, eq, sql } from 'drizzle-orm'

import type { OverviewStats, ProxySessionDetail, ProxySessionListItem, ProxySessionStatus, SessionEventRecord } from '../../shared/types'

import { maskApiKey } from './api-keys'
import { flushDbToDisk, getDb } from './database'
import { apiKeys, sessionEvents, sessions } from './schema'

function nowIso() {
  return new Date().toISOString()
}

function parseJson(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function sessionRowToListItem(row: typeof sessions.$inferSelect, key?: typeof apiKeys.$inferSelect | null): ProxySessionListItem {
  return {
    id: row.id,
    devinSessionId: row.devinSessionId,
    devinUrl: row.devinUrl,
    status: row.status,
    promptSnippet: row.promptSnippet,
    apiKeyName: key?.name ?? null,
    apiKeyMasked: key ? maskApiKey(key.apiKey) : null,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    lastPolledAt: row.lastPolledAt,
    lastError: row.lastError,
    updatedAt: row.updatedAt
  }
}

export async function createProxySession(input: {
  clientIp: string | null
  promptSnippet: string
  originalPrompt: string
}) {
  const timestamp = nowIso()
  const db = await getDb()
  await db.insert(sessions).values({
    clientIp: input.clientIp,
    promptSnippet: input.promptSnippet,
    originalPrompt: input.originalPrompt,
    status: 'queued',
    lastError: null,
    rawLatestPayload: null,
    startedAt: timestamp,
    completedAt: null,
    lastPolledAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    devinSessionId: null,
    devinUrl: null,
    apiKeyId: null
  }).run()

  await flushDbToDisk()

  const created = await db.select({ id: sessions.id }).from(sessions).orderBy(desc(sessions.id)).get()
  if (!created) {
    throw new Error('Failed to create session record.')
  }

  return created.id
}

export async function attachDevinSession(input: {
  sessionId: number
  apiKeyId: number
  devinSessionId: string
  devinUrl: string | null
  status: ProxySessionStatus
}) {
  const db = await getDb()
  await db.update(sessions).set({
    apiKeyId: input.apiKeyId,
    devinSessionId: input.devinSessionId,
    devinUrl: input.devinUrl,
    status: input.status,
    updatedAt: nowIso()
  }).where(eq(sessions.id, input.sessionId)).run()

  await flushDbToDisk()
}

export async function updateSessionProgress(input: {
  sessionId: number
  status?: ProxySessionStatus
  rawLatestPayload?: Record<string, unknown> | null
  lastError?: string | null
  completed?: boolean
}) {
  const timestamp = nowIso()
  const db = await getDb()
  await db.update(sessions).set({
    status: input.status,
    rawLatestPayload: input.rawLatestPayload ? JSON.stringify(input.rawLatestPayload) : undefined,
    lastPolledAt: timestamp,
    lastError: input.lastError,
    completedAt: input.completed ? timestamp : undefined,
    updatedAt: timestamp
  }).where(eq(sessions.id, input.sessionId)).run()

  await flushDbToDisk()
}

export async function appendSessionEvent(input: {
  sessionId: number
  sequence: number
  externalId?: string | null
  eventType: string
  summary?: string | null
  payload?: Record<string, unknown> | null
}) {
  const db = await getDb()
  await db.insert(sessionEvents).values({
    sessionId: input.sessionId,
    sequence: input.sequence,
    externalId: input.externalId ?? null,
    eventType: input.eventType,
    summary: input.summary ?? null,
    payload: input.payload ? JSON.stringify(input.payload) : null,
    createdAt: nowIso()
  }).run()

  await flushDbToDisk()
}

export async function listProxySessions(limit = 50) {
  const db = await getDb()
  const rows = await db
    .select({ session: sessions, key: apiKeys })
    .from(sessions)
    .leftJoin(apiKeys, eq(sessions.apiKeyId, apiKeys.id))
    .orderBy(desc(sessions.startedAt), desc(sessions.id))
    .limit(limit)
    .all()

  return rows.map(({ session, key }) => sessionRowToListItem(session, key))
}

export async function getProxySessionDetail(id: number): Promise<ProxySessionDetail | null> {
  const db = await getDb()
  const row = await db
    .select({ session: sessions, key: apiKeys })
    .from(sessions)
    .leftJoin(apiKeys, eq(sessions.apiKeyId, apiKeys.id))
    .where(eq(sessions.id, id))
    .get()

  if (!row) {
    return null
  }

  const events = (await db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, id))
    .orderBy(asc(sessionEvents.sequence), asc(sessionEvents.id))
    .all())
    .map((event): SessionEventRecord => ({
      id: event.id,
      sessionId: event.sessionId,
      sequence: event.sequence,
      eventType: event.eventType,
      summary: event.summary,
      payload: parseJson(event.payload),
      createdAt: event.createdAt
    }))

  return {
    ...sessionRowToListItem(row.session, row.key),
    originalPrompt: row.session.originalPrompt,
    clientIp: row.session.clientIp,
    rawLatestPayload: parseJson(row.session.rawLatestPayload),
    events
  }
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const db = await getDb()
  const totalSessionsRow = await db
    .select({ totalSessions: sql<number>`count(*)` })
    .from(sessions)
    .get()

  const activeSessionsRow = await db
    .select({ activeSessions: sql<number>`count(*)` })
    .from(sessions)
    .where(eq(sessions.status, 'running'))
    .get()

  const availableKeysRow = await db
    .select({ availableKeys: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.status, 'active'))
    .get()

  const rateLimitedKeysRow = await db
    .select({ rateLimitedKeys: sql<number>`count(*)` })
    .from(apiKeys)
    .where(eq(apiKeys.status, 'rate_limited'))
    .get()

  return {
    activeSessions: activeSessionsRow?.activeSessions ?? 0,
    totalSessions: totalSessionsRow?.totalSessions ?? 0,
    availableKeys: availableKeysRow?.availableKeys ?? 0,
    rateLimitedKeys: rateLimitedKeysRow?.rateLimitedKeys ?? 0
  }
}
