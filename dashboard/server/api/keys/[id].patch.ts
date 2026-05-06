import { getRouterParam } from 'h3'

import { apiKeyUpdateSchema, getApiKeyRecordById, updateApiKey } from '../../utils/api-keys'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid API key id.' })
  }

  if (!await getApiKeyRecordById(id)) {
    throw createError({ statusCode: 404, statusMessage: 'API key not found.' })
  }

  const parsed = apiKeyUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid API key update payload.' })
  }

  return updateApiKey(id, parsed.data)
})
