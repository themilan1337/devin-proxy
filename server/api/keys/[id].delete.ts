import { getRouterParam } from 'h3'

import { deleteApiKey } from '../../utils/api-keys'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid API key id.' })
  }

  if (!await deleteApiKey(id)) {
    throw createError({ statusCode: 404, statusMessage: 'API key not found.' })
  }

  return {
    ok: true
  }
})
