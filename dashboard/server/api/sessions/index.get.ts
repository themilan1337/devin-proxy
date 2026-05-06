import { listProxySessions } from '../../utils/session-store'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = query.limit ? Number(query.limit) : 50
  return listProxySessions(Number.isFinite(limit) && limit > 0 ? limit : 50)
})
