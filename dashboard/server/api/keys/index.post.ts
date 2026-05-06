import { apiKeyInputSchema, createApiKey } from '../../utils/api-keys'

export default defineEventHandler(async (event) => {
  const parsed = apiKeyInputSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid API key payload.' })
  }

  return createApiKey(parsed.data)
})
