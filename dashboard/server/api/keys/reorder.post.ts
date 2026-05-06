import { apiKeyReorderSchema, reorderApiKeys } from '../../utils/api-keys'

export default defineEventHandler(async (event) => {
  const parsed = apiKeyReorderSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid reorder payload.' })
  }

  return reorderApiKeys(parsed.data.orderedIds)
})
