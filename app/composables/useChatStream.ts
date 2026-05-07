import type { ChatStatus } from 'ai'

export interface StreamOptions {
  messages: Array<{ role: string; content: string }>
  onDelta: (delta: string) => void
  onComplete: () => void
  onError: (msg: string) => void
}

export function useChatStream() {
  const status = ref<ChatStatus>('ready')
  const error = ref<string | null>(null)

  let controller: AbortController | null = null

  async function sendMessage(options: StreamOptions) {
    controller?.abort()
    controller = new AbortController()
    status.value = 'streaming'
    error.value = null

    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'devin-proxy-hub',
          messages: options.messages,
          stream: true
        })
      })

      if (!res.ok) {
        let msg = `Request failed: ${res.status}`
        try {
          const body = await res.json()
          msg = (body as { error?: { message?: string } }).error?.message ?? msg
        } catch {}
        throw new Error(msg)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            status.value = 'ready'
            options.onComplete()
            break outer
          }
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>
            }
            const content = parsed.choices?.[0]?.delta?.content
            if (typeof content === 'string' && content) {
              options.onDelta(content)
            }
          } catch {}
        }
      }

      status.value = 'ready'
      options.onComplete()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        status.value = 'ready'
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        error.value = msg
        status.value = 'error'
        options.onError(msg)
      }
    }
  }

  function stop() {
    controller?.abort()
    controller = null
    status.value = 'ready'
  }

  return { status, error, sendMessage, stop }
}
