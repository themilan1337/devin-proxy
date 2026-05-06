import { listApiKeys } from '../../utils/api-keys'

export default defineEventHandler(async () => {
  return listApiKeys()
})
