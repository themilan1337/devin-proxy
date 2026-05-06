import { getRouterParam } from 'h3'

import { getProxySessionDetail } from '../../utils/session-store'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid session id.' })
  }

  const session = await getProxySessionDetail(id)
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found.' })
  }

  return session
})
