import { listApiKeys } from '../utils/api-keys'
import { getOverviewStats, listProxySessions } from '../utils/session-store'

export default defineEventHandler(async () => {
  return {
    stats: await getOverviewStats(),
    keys: await listApiKeys(),
    sessions: await listProxySessions(12)
  }
})
