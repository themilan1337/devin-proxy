import { getRouterParam } from 'h3'

import { getApiKeyRecordById, markApiKeyInvalid, markApiKeyRateLimited, restoreApiKey } from '../../../utils/api-keys'

// ── Probe strategy ───────────────────────────────────────────────────────────
//
// v1 (personal key, orgId = ''):
//   GET /v1/sessions?limit=1
//   200 → valid   |   401 → bad token   |   429 → rate limited
//
// v3 (service user, orgId set):
//   GET /v3/self
//   200 → valid, also returns org_id so we can detect mismatches
//   401 → bad token   |   403 → missing ReadAccountMeta (rare, don't penalise)
//   429 → rate limited

interface SelfResponse {
  principal_type: string
  service_user_id?: string
  service_user_name?: string
  org_id?: string | null
}

function getV1Base(v3Base: string) {
  return v3Base.replace(/\/v\d+\/?$/, '/v1').replace(/\/$/, '')
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid API key id.' })
  }

  const record = await getApiKeyRecordById(id)
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'API key not found.' })
  }

  const runtimeConfig = useRuntimeConfig()
  const base = runtimeConfig.devinProxy.devinApiBase
  const cooldownMs = runtimeConfig.devinProxy.rateLimitCooldownMs

  const isV1 = !record.orgId || record.orgId.trim() === ''

  // ── Fire the probe ───────────────────────────────────────────────────────
  let response: Response
  let rawBody: string
  const probeUrl = isV1
    ? `${getV1Base(base)}/sessions?limit=1`
    : `${base}/self`

  try {
    response = await fetch(probeUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${record.apiKey}` }
    })
    rawBody = await response.text()
  } catch (networkError) {
    throw createError({
      statusCode: 502,
      statusMessage: networkError instanceof Error
        ? `Network error reaching Devin API: ${networkError.message}`
        : 'Network error reaching Devin API.'
    })
  }

  // ── Parse response ───────────────────────────────────────────────────────
  let payload: unknown = null
  if (rawBody) {
    try { payload = JSON.parse(rawBody) } catch { payload = { raw: rawBody } }
  }

  function extractMessage(p: unknown, fallback: string) {
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      const obj = p as Record<string, unknown>
      if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim()
      if (typeof obj.detail === 'string' && obj.detail.trim()) return obj.detail.trim()
      const err = obj.error
      if (err && typeof err === 'object' && !Array.isArray(err)) {
        const errObj = err as Record<string, unknown>
        if (typeof errObj.message === 'string' && errObj.message.trim()) return errObj.message.trim()
      }
    }
    return fallback
  }

  const httpStatus = response.status
  const bodySnippet = rawBody.length > 500 ? `${rawBody.slice(0, 500)}…` : rawBody

  // ── 200: token is valid ──────────────────────────────────────────────────
  if (response.ok) {
    if (isV1) {
      const updated = await restoreApiKey(id)
      return {
        valid: true,
        httpStatus,
        message: 'API key is valid. Personal Devin key accepted (v1 API).',
        apiVersion: 'v1',
        key: updated
      }
    }

    // v3: compare returned org_id against stored orgId
    const self = payload as SelfResponse
    const returnedOrgId = self?.org_id ?? null
    const orgMismatch = returnedOrgId && returnedOrgId !== record.orgId

    if (orgMismatch) {
      return {
        valid: false,
        status: 'org_mismatch',
        httpStatus,
        message: `Token is valid, but the stored org ID is wrong. Your token belongs to "${returnedOrgId}", not "${record.orgId}". Please edit the key and correct the org ID.`,
        hint: `The correct org ID for this token is: ${returnedOrgId}`,
        detectedOrgId: returnedOrgId,
        bodySnippet
      }
    }

    const updated = await restoreApiKey(id)
    return {
      valid: true,
      httpStatus,
      message: 'API key is valid. Token accepted by Devin (v3 API).',
      apiVersion: 'v3',
      selfInfo: {
        principal_type: self?.principal_type,
        service_user_id: self?.service_user_id,
        service_user_name: self?.service_user_name,
        org_id: returnedOrgId
      },
      key: updated
    }
  }

  // ── 401: token is invalid or revoked ────────────────────────────────────
  if (httpStatus === 401) {
    const msg = extractMessage(payload, 'Unauthorized — the API key is invalid or has been revoked.')
    await markApiKeyInvalid(id, msg)
    return {
      valid: false,
      status: 'invalid',
      httpStatus,
      message: msg,
      hint: isV1
        ? 'Regenerate your personal API key on the Devin API keys page (Settings → API keys).'
        : 'Regenerate the service user API key in Devin → Settings → Service users.',
      bodySnippet
    }
  }

  // ── 403: ambiguous — don't penalise ─────────────────────────────────────
  if (httpStatus === 403) {
    const msg = extractMessage(payload, 'Forbidden — the token may lack the required permission.')
    return {
      valid: false,
      status: 'permission_error',
      httpStatus,
      message: msg,
      hint: isV1
        ? 'Unexpected 403 on v1 API. Try regenerating your personal key.'
        : 'The /self endpoint requires ReadAccountMeta permission. Recreate the service user with the Member or Admin role.',
      bodySnippet
    }
  }

  // ── 429: rate limited ────────────────────────────────────────────────────
  if (httpStatus === 429) {
    const msg = extractMessage(payload, 'Rate limit reached.')
    await markApiKeyRateLimited(id, msg, cooldownMs)
    return { valid: false, status: 'rate_limited', httpStatus, message: msg, bodySnippet }
  }

  // ── Anything else: ambiguous — don't penalise ────────────────────────────
  const msg = extractMessage(payload, `Devin API responded with HTTP ${httpStatus}.`)
  return { valid: false, status: 'error', httpStatus, message: msg, bodySnippet }
})
