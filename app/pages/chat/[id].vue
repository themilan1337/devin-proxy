<script setup lang="ts">
import type { UIMessage } from 'ai'
import { isTextUIPart } from 'ai'
import { marked } from 'marked'
import type { ApiKeyListItem } from '~/utils/types'

const route = useRoute()
const toast = useToast()
const convId = computed(() => route.params.id as string)

const {
  getConversation,
  addMessage,
  updateLastMessage,
  setTitle
} = useChatHistory()
const { status, error, sendMessage, stop } = useChatStream()

const conversation = computed(() => getConversation(convId.value))

onMounted(async () => {
  // VueUse useLocalStorage with initOnMounted:true populates on mount —
  // nextTick ensures that write has happened before we read.
  await nextTick()

  if (!conversation.value) {
    navigateTo('/chat')
    return
  }

  // Auto-send when navigating here from the index page — the conversation
  // already has the user's first message but no reply yet.
  const msgs = conversation.value.messages
  if (msgs.length === 1 && msgs[0]?.role === 'user') {
    await triggerResponse(msgs.map(m => ({ role: m.role, content: m.content })))
  }
})

const selectedKeyId = useCookie<number | 'auto'>('chat-key-id', { default: () => 'auto' })

const { data: keys } = await useFetch<ApiKeyListItem[]>('/api/keys')

const keyOptions = computed(() => [
  { label: 'Auto (round-robin)', value: 'auto' as const },
  ...(keys.value ?? [])
    .filter(k => k.status === 'active' || k.status === 'rate_limited')
    .map(k => ({ label: `${k.name} (${k.maskedKey})`, value: k.id }))
])

const input = ref('')
const historyOpen = ref(false)
const streamingMessageId = ref<string | null>(null)
const { copy, copied } = useClipboard()

const uiMessages = computed((): UIMessage[] =>
  (conversation.value?.messages ?? []).map(m => ({
    id: m.id,
    role: m.role,
    parts: [{ type: 'text' as const, text: m.content }]
  }))
)

function getMessageText(message: UIMessage): string {
  const textPart = message.parts.find(isTextUIPart)
  return textPart?.text ?? ''
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  try {
    return marked.parse(text, { async: false }) as string
  } catch {
    return text
  }
}

async function triggerResponse(messages: Array<{ role: string; content: string }>) {
  const asstMsgId = crypto.randomUUID()

  addMessage(convId.value, {
    id: asstMsgId,
    role: 'assistant',
    content: '',
    createdAt: new Date().toISOString()
  })

  streamingMessageId.value = asstMsgId
  let streamedContent = ''

  await sendMessage({
    messages,
    onDelta(delta) {
      streamedContent += delta
      updateLastMessage(convId.value, streamedContent)
    },
    onComplete() {
      streamingMessageId.value = null
      const conv = getConversation(convId.value)
      if (conv && !conv.title) {
        const firstUser = conv.messages.find(m => m.role === 'user')
        if (firstUser) {
          const words = firstUser.content.split(/\s+/).slice(0, 6).join(' ')
          setTitle(convId.value, words.length < firstUser.content.length ? `${words}…` : words)
        }
      }
    },
    onError(msg) {
      streamingMessageId.value = null
      updateLastMessage(convId.value, `_(Error: ${msg})_`)
      toast.add({
        description: msg,
        icon: 'i-lucide-alert-circle',
        color: 'error',
        duration: 0
      })
    }
  })
}

async function handleSubmit(e: Event) {
  e.preventDefault()
  const text = input.value.trim()
  if (!text || status.value === 'streaming') return

  input.value = ''

  addMessage(convId.value, {
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    createdAt: new Date().toISOString()
  })

  const historyMessages = (conversation.value?.messages ?? []).map(m => ({
    role: m.role,
    content: m.content
  }))

  await triggerResponse(historyMessages)
}
</script>

<template>
  <ChatHistoryModal v-model:open="historyOpen" />

  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <UDashboardNavbar
        class="absolute top-0 inset-x-0 border-b-0 z-10 backdrop-blur pointer-events-none sm:px-4"
        :ui="{ left: 'pointer-events-auto min-w-0', right: 'pointer-events-auto' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #center>
          <p class="text-sm font-semibold text-highlighted truncate max-w-sm">
            {{ conversation?.title || 'New conversation' }}
          </p>
        </template>

        <template #right>
          <USelectMenu
            v-model="selectedKeyId"
            :items="keyOptions"
            size="sm"
            value-key="value"
            variant="ghost"
            icon="i-lucide-key-round"
            class="max-w-44"
          />

          <UButton
            icon="i-lucide-history"
            label="History"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="historyOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-1">
        <UContainer class="flex-1 flex flex-col gap-4 sm:gap-6">
          <UChatMessages
            should-auto-scroll
            :messages="uiMessages"
            :status="status"
            :spacing-offset="160"
            class="pt-(--ui-header-height) pb-4 sm:pb-6"
          >
            <template #indicator>
              <div class="flex items-center gap-1.5">
                <UChatShimmer text="Devin is thinking…" class="text-sm" />
              </div>
            </template>

            <template #content="{ message }">
              <template v-if="message.role === 'assistant'">
                <div
                  v-if="message.id === streamingMessageId && !getMessageText(message)"
                  class="text-sm text-muted italic"
                >
                  Waiting for response…
                </div>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div
                  v-else
                  class="prose prose-sm dark:prose-invert max-w-none"
                  v-html="renderMarkdown(getMessageText(message))"
                />
              </template>
              <p v-else class="whitespace-pre-wrap text-sm">
                {{ getMessageText(message) }}
              </p>
            </template>

            <template #actions="{ message }">
              <template v-if="message.role === 'assistant' && status !== 'streaming'">
                <UTooltip text="Copy response">
                  <UButton
                    size="sm"
                    :color="copied ? 'primary' : 'neutral'"
                    variant="ghost"
                    :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                    aria-label="Copy"
                    @click="copy(getMessageText(message))"
                  />
                </UTooltip>
              </template>
            </template>
          </UChatMessages>

          <UChatPrompt
            v-model="input"
            :error="error ? new Error(error) : undefined"
            variant="subtle"
            placeholder="Message Devin…"
            class="sticky bottom-0 rounded-b-none z-10 [view-transition-name:chat-prompt]"
            :ui="{ base: 'px-1.5' }"
            @submit="handleSubmit"
          >
            <template #footer>
              <USelectMenu
                v-model="selectedKeyId"
                :items="keyOptions"
                size="sm"
                value-key="value"
                variant="ghost"
                icon="i-lucide-key-round"
                class="min-w-0 max-w-44"
              />

              <UChatPromptSubmit
                :status="status"
                color="neutral"
                size="sm"
                @stop="stop()"
              />
            </template>
          </UChatPrompt>
        </UContainer>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style>
@reference "~/assets/css/main.css";
.prose p { @apply mb-3 last:mb-0; }
.prose pre { @apply my-3 rounded-lg bg-elevated p-4 text-xs overflow-x-auto; }
.prose code:not(pre code) { @apply rounded bg-elevated px-1 py-0.5 text-xs font-mono text-highlighted; }
.prose ul { @apply my-2 list-disc pl-5 space-y-1; }
.prose ol { @apply my-2 list-decimal pl-5 space-y-1; }
.prose li { @apply text-sm; }
.prose strong { @apply font-semibold text-highlighted; }
.prose a { @apply text-primary underline; }
.prose blockquote { @apply border-l-2 border-primary/40 pl-4 text-muted italic; }
.prose h1, .prose h2, .prose h3, .prose h4 { @apply font-semibold text-highlighted mt-4 mb-2; }
.prose h1 { @apply text-xl; }
.prose h2 { @apply text-lg; }
.prose h3 { @apply text-base; }
.prose table { @apply w-full text-sm border-collapse; }
.prose th { @apply border border-default px-3 py-2 text-left font-semibold bg-elevated; }
.prose td { @apply border border-default px-3 py-2; }
</style>
