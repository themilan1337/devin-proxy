<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const route = useRoute()
const toast = useToast()
const { groups, deleteConversation } = useChatHistory()

async function goToChat(id: string) {
  open.value = false
  await navigateTo(`/chat/${id}`)
}

function handleDelete(id: string) {
  deleteConversation(id)
  if (route.params.id === id) {
    open.value = false
    navigateTo('/chat')
  }
  toast.add({ title: 'Deleted', icon: 'i-lucide-trash', color: 'success' })
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Chat history"
    description="Your recent conversations"
    :ui="{ body: 'p-0', footer: 'p-4' }"
  >
    <template #body>
      <div class="max-h-[60vh] overflow-y-auto">
        <div
          v-if="groups.length === 0"
          class="flex flex-col items-center justify-center gap-2 py-16 text-center"
        >
          <UIcon name="i-lucide-message-circle-dashed" class="size-10 text-muted" />
          <p class="text-sm text-muted">
            No conversations yet
          </p>
          <UButton
            label="Start a new chat"
            icon="i-lucide-plus"
            size="sm"
            color="neutral"
            variant="outline"
            to="/chat"
            @click="open = false"
          />
        </div>

        <div v-else>
          <template v-for="group in groups" :key="group.id">
            <p class="sticky top-0 z-10 bg-default px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-default/60">
              {{ group.label }}
            </p>
            <div
              v-for="conv in group.items"
              :key="conv.id"
              class="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-elevated/60 border-b border-default/40 last:border-0"
              :class="route.params.id === conv.id ? 'bg-elevated' : ''"
              @click="goToChat(conv.id)"
            >
              <UIcon
                name="i-lucide-message-circle"
                class="size-4 shrink-0 text-muted"
              />
              <div class="flex-1 min-w-0">
                <p
                  class="truncate text-sm font-medium"
                  :class="route.params.id === conv.id ? 'text-primary' : 'text-highlighted'"
                >
                  {{ conv.title || 'New conversation' }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
              <UButton
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 shrink-0"
                aria-label="Delete"
                @click.stop="handleDelete(conv.id)"
              />
            </div>
          </template>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <UButton
          label="New chat"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          to="/chat"
          @click="open = false"
        />
        <UButton
          label="Close"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
