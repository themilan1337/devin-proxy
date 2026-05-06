import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { ApiKeyStatus, ProxySessionStatus } from '../../shared/types'

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull(),
  orgId: text('org_id').notNull(),
  status: text('status').$type<ApiKeyStatus>().notNull().default('active'),
  orderIndex: integer('order_index').notNull().default(0),
  cooldownUntil: text('cooldown_until'),
  lastError: text('last_error'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, table => ({
  statusIdx: index('api_keys_status_idx').on(table.status),
  orderIdx: index('api_keys_order_idx').on(table.orderIndex)
}))

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  devinSessionId: text('devin_session_id'),
  devinUrl: text('devin_url'),
  clientIp: text('client_ip'),
  promptSnippet: text('prompt_snippet').notNull(),
  originalPrompt: text('original_prompt').notNull(),
  apiKeyId: integer('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
  status: text('status').$type<ProxySessionStatus>().notNull().default('queued'),
  lastError: text('last_error'),
  rawLatestPayload: text('raw_latest_payload'),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  lastPolledAt: text('last_polled_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, table => ({
  statusIdx: index('sessions_status_idx').on(table.status),
  devinSessionIdx: index('sessions_devin_session_idx').on(table.devinSessionId)
}))

export const sessionEvents = sqliteTable('session_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  externalId: text('external_id'),
  eventType: text('event_type').notNull(),
  summary: text('summary'),
  payload: text('payload'),
  createdAt: text('created_at').notNull()
}, table => ({
  sessionIdx: index('session_events_session_idx').on(table.sessionId, table.sequence)
}))

export const schema = {
  apiKeys,
  sessionEvents,
  sessions
}
