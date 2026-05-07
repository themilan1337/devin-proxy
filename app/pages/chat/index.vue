<script setup lang="ts">
import type { ApiKeyListItem } from '~/utils/types'

const historyOpen = ref(false)
const input = ref('')
const selectedKeyId = ref<number | 'auto'>('auto')
const loading = ref(false)

const { data: keys } = await useFetch<ApiKeyListItem[]>('/api/keys')

const keyOptions = computed(() => [
  { label: 'Auto (round-robin)', value: 'auto' as const },
  ...(keys.value ?? [])
    .filter(k => k.status === 'active' || k.status === 'rate_limited')
    .map(k => ({ label: `${k.name} (${k.maskedKey})`, value: k.id }))
])

const { createConversation, addMessage, setTitle } = useChatHistory()

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

const quickPrompts = [
  { label: 'Fix a bug in my code', icon: 'i-lucide-bug' },
  { label: 'Review my pull request', icon: 'i-lucide-git-pull-request' },
  { label: 'Write unit tests', icon: 'i-lucide-flask-conical' },
  { label: 'Explain this codebase', icon: 'i-lucide-search-code' },
  { label: 'Set up CI/CD pipeline', icon: 'i-lucide-cpu' },
  { label: 'Refactor this function', icon: 'i-lucide-code-2' }
]

async function startChat(prompt: string) {
  if (!prompt.trim() || loading.value) return

  loading.value = true
  const id = crypto.randomUUID()

  createConversation(id, 'devin')

  addMessage(id, {
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt.trim(),
    createdAt: new Date().toISOString()
  })

  const titleWords = prompt.trim().split(/\s+/).slice(0, 6).join(' ')
  setTitle(id, titleWords.length < prompt.trim().length ? `${titleWords}…` : titleWords)

  await navigateTo(`/chat/${id}`)
}

async function onSubmit() {
  await startChat(input.value)
}
</script>

<template>
  <ChatHistoryModal v-model:open="historyOpen" />

  <UDashboardPanel id="chat-home" :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <UDashboardNavbar title="Chat">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
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
      <UContainer class="flex flex-col justify-center gap-6 py-12 max-w-3xl mx-auto min-h-full">
        <div class="space-y-1">
          <h1 class="text-3xl font-bold text-highlighted">
            {{ greeting }}
          </h1>
          <p class="text-base text-muted">
            How can Devin help you today?
          </p>
        </div>

        <UChatPrompt
          v-model="input"
          :status="loading ? 'streaming' : 'ready'"
          variant="subtle"
          placeholder="Ask Devin anything…"
          class="[view-transition-name:chat-prompt]"
          :ui="{ base: 'px-1.5' }"
          @submit="onSubmit"
        >
          <template #footer>
            <USelectMenu
              v-model="selectedKeyId"
              :items="keyOptions"
              size="sm"
              value-key="value"
              variant="ghost"
              icon="i-lucide-key-round"
              class="min-w-0 max-w-48"
            />

            <UChatPromptSubmit color="neutral" size="sm" :status="loading ? 'streaming' : 'ready'" />
          </template>
        </UChatPrompt>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="qp in quickPrompts"
            :key="qp.label"
            :icon="qp.icon"
            :label="qp.label"
            size="sm"
            color="neutral"
            variant="outline"
            class="rounded-full"
            @click="startChat(qp.label)"
          />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
