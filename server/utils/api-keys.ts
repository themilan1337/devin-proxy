import { asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import type { ApiKeyListItem, ApiKeyStatus } from '../../shared/types'

import { flushDbToDisk, getDb } from './database'
import { apiKeys } from './schema'

export type ApiKeyRecord = typeof apiKeys.$inferSelect

const apiKeyStatusSchema = z.enum(['active', 'rate_limited', 'invalid', 'disabled', 'exhausted'])

export const apiKeyInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  apiKey: z.string().trim().min(1, 'API key is required'),
  // Empty/omitted = v1 personal key (no org needed); set = v3 service user key
  orgId: z.string().trim().optional().default(''),
  status: apiKeyStatusSchema.optional().default('active')
})

export const apiKeyUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().min(1).optional(),
  orgId: z.string().trim().optional(),
  status: apiKeyStatusSchema.optional()
})

export const apiKeyReorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1)
})

function nowIso() {
  return new Date().toISOString()
}

export function maskApiKey(apiKey: string) {
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}...${apiKey.slice(-2)}`
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
}

function toApiKeyListItem(record: ApiKeyRecord): ApiKeyListItem {
  return {
    id: record.id,
    name: record.name,
    orgId: record.orgId,
    maskedKey: maskApiKey(record.apiKey),
    status: record.status,
    orderIndex: record.orderIndex,
    cooldownUntil: record.cooldownUntil,
    lastError: record.lastError,
    lastUsedAt: record.lastUsedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  }
}

export async function getApiKeyRecordById(id: number) {
  const db = await getDb()
  return await db.select().from(apiKeys).where(eq(apiKeys.id, id)).get() ?? null
}

export async function listApiKeys() {
  const db = await getDb()
  const records = await db
    .select()
    .from(apiKeys)
    .orderBy(asc(apiKeys.orderIndex), asc(apiKeys.id))
    .all()

  return records.map(toApiKeyListItem)
}

export async function createApiKey(input: z.infer<typeof apiKeyInputSchema>) {
  const db = await getDb()
  const existingCount = (await db.select({ id: apiKeys.id }).from(apiKeys).all()).length
  const timestamp = nowIso()

  await db.insert(apiKeys).values({
    name: input.name,
    apiKey: input.apiKey,
    orgId: input.orgId,
    status: input.status,
    orderIndex: existingCount,
    cooldownUntil: null,
    lastError: null,
    lastUsedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  }).run()

  await flushDbToDisk()

  const created = await db.select().from(apiKeys).orderBy(desc(apiKeys.id)).get()
  if (!created) {
    throw new Error('Failed to create API key record.')
  }

  return toApiKeyListItem(created)
}

export async function updateApiKey(id: number, input: z.infer<typeof apiKeyUpdateSchema>) {
  const existing = await getApiKeyRecordById(id)
  if (!existing) {
    return null
  }

  const nextStatus = input.status ?? existing.status
  const shouldClearCooldown = nextStatus === 'active'

  const db = await getDb()
  await db.update(apiKeys).set({
    name: input.name ?? existing.name,
    apiKey: input.apiKey ?? existing.apiKey,
    orgId: input.orgId ?? existing.orgId,
    status: nextStatus,
    cooldownUntil: shouldClearCooldown ? null : existing.cooldownUntil,
    lastError: shouldClearCooldown ? null : existing.lastError,
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()

  const updated = await getApiKeyRecordById(id)
  return updated ? toApiKeyListItem(updated) : null
}

export async function deleteApiKey(id: number) {
  const db = await getDb()
  const existing = await getApiKeyRecordById(id)
  if (!existing) {
    return false
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, id)).run()

  const remaining = await db.select().from(apiKeys).orderBy(asc(apiKeys.orderIndex), asc(apiKeys.id)).all()
  for (const [index, record] of remaining.entries()) {
    await db.update(apiKeys).set({ orderIndex: index, updatedAt: nowIso() }).where(eq(apiKeys.id, record.id)).run()
  }

  await flushDbToDisk()

  return true
}

export async function reorderApiKeys(orderedIds: number[]) {
  const db = await getDb()
  const timestamp = nowIso()

  for (const [index, id] of orderedIds.entries()) {
    await db.update(apiKeys).set({ orderIndex: index, updatedAt: timestamp }).where(eq(apiKeys.id, id)).run()
  }

  await flushDbToDisk()

  return listApiKeys()
}

export async function listCandidateApiKeys() {
  const db = await getDb()
  const currentTime = nowIso()
  const records = await db.select().from(apiKeys).orderBy(asc(apiKeys.orderIndex), asc(apiKeys.id)).all()
  const candidates: ApiKeyRecord[] = []

  for (const record of records) {
    if (record.status === 'invalid' || record.status === 'disabled' || record.status === 'exhausted') {
      continue
    }

    if (record.status === 'rate_limited') {
      if (record.cooldownUntil && record.cooldownUntil > currentTime) {
        continue
      }

      await db.update(apiKeys).set({
        status: 'active',
        cooldownUntil: null,
        lastError: null,
        updatedAt: currentTime
      }).where(eq(apiKeys.id, record.id)).run()

      candidates.push({ ...record, status: 'active' as ApiKeyStatus, cooldownUntil: null, lastError: null })
      continue
    }

    candidates.push(record)
  }

  await flushDbToDisk()
  return candidates
}

export async function markApiKeyUsed(id: number) {
  const db = await getDb()
  await db.update(apiKeys).set({
    lastUsedAt: nowIso(),
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()
}

export async function markApiKeyRateLimited(id: number, message: string, cooldownMs: number) {
  const db = await getDb()
  await db.update(apiKeys).set({
    status: 'rate_limited',
    cooldownUntil: new Date(Date.now() + cooldownMs).toISOString(),
    lastError: message,
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()
}

export async function markApiKeyInvalid(id: number, message: string) {
  const db = await getDb()
  await db.update(apiKeys).set({
    status: 'invalid',
    cooldownUntil: null,
    lastError: message,
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()
}

export async function restoreApiKey(id: number) {
  const db = await getDb()
  await db.update(apiKeys).set({
    status: 'active',
    cooldownUntil: null,
    lastError: null,
    lastUsedAt: nowIso(),
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()

  const updated = await getApiKeyRecordById(id)
  return updated ? toApiKeyListItem(updated) : null
}

export async function markApiKeyExhausted(id: number, message: string) {
  const db = await getDb()
  await db.update(apiKeys).set({
    status: 'exhausted',
    cooldownUntil: null,
    lastError: message,
    updatedAt: nowIso()
  }).where(eq(apiKeys.id, id)).run()

  await flushDbToDisk()
}
