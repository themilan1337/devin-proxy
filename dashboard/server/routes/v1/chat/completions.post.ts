import { chatCompletionsRequestSchema, buildPromptSnippet, compileDevinPrompt, createChatCompletionId, createChunk, createCompletionResponse, createOpenAIErrorPayload, finishReasonFromStatus } from '../../../utils/openai'
import { proxyTimestamp, runProxySession } from '../../../utils/devin'

export default defineEventHandler(async (event) => {
  const parsed = chatCompletionsRequestSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Invalid chat completion payload.' })
  }

  const request = parsed.data
  const created = proxyTimestamp()
  const chatId = createChatCompletionId()
  const prompt = compileDevinPrompt(request.messages)
  const promptSnippet = buildPromptSnippet(prompt)
  const clientIp = getRequestIP(event) ?? null

  if (request.stream) {
    const eventStream = createEventStream(event)
    let closed = false

    eventStream.onClosed(() => {
      closed = true
    })

    void (async () => {
      try {
        await eventStream.push({
          data: JSON.stringify(createChunk({
            id: chatId,
            model: request.model,
            created,
            role: 'assistant'
          }))
        })

        const result = await runProxySession({
          request,
          clientIp,
          prompt,
          promptSnippet,
          onDelta: async (content) => {
            await eventStream.push({
              data: JSON.stringify(createChunk({
                id: chatId,
                model: request.model,
                created,
                content
              }))
            })
          },
          isAborted: () => closed
        })

        await eventStream.push({
          data: JSON.stringify(createChunk({
            id: chatId,
            model: request.model,
            created,
            finishReason: finishReasonFromStatus(result.finalStatus)
          }))
        })

        await eventStream.push({ data: '[DONE]' })
      } catch (error) {
        await eventStream.push({ data: JSON.stringify(createOpenAIErrorPayload(error)) })
      } finally {
        await eventStream.close()
      }
    })()

    return eventStream.send()
  }

  try {
    const result = await runProxySession({
      request,
      clientIp,
      prompt,
      promptSnippet,
      onDelta: () => undefined,
      isAborted: () => false
    })

    return createCompletionResponse({
      id: chatId,
      model: request.model,
      created,
      content: result.output,
      finishReason: finishReasonFromStatus(result.finalStatus)
    })
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: createOpenAIErrorPayload(error).error.message
    })
  }
})
