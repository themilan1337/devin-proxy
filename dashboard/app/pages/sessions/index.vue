<script setup lang="ts">
import type { ProxySessionListItem, ProxySessionStatus } from '~/utils/types'

const { data: sessions, refresh, status } = await useFetch<ProxySessionListItem[]>('/api/sessions?limit=100', {
  default: () => []
})

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshTimer = setInterval(() => {
    refresh()
  }, 10000)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

function statusColor(statusValue: ProxySessionStatus) {
  switch (statusValue) {
    case 'finished':
      return 'success'
    case 'running':
      return 'primary'
    case 'queued':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'neutral'
  }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}
</script>

<template>
  <UDashboardPanel id="sessions">
    <template #header>
      <UDashboardNavbar title="Sessions">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div v-if="status === 'pending'" class="space-y-3">
          <div v-for="placeholder in 4" :key="placeholder" class="h-28 rounded-xl border border-default bg-elevated/40" />
        </div>

        <div v-else-if="!sessions.length" class="rounded-xl border border-dashed border-default p-8 text-sm text-muted">
          No proxy sessions have been recorded yet.
        </div>

        <template v-else>
          <NuxtLink
            v-for="session in sessions"
            :key="session.id"
            :to="`/sessions/${session.id}`"
            class="block rounded-xl border border-default bg-default px-4 py-4 transition hover:border-primary/40 hover:bg-elevated/40"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-highlighted">
                    Session #{{ session.id }}
                  </p>
                  <UBadge :color="statusColor(session.status)" variant="subtle" class="capitalize">
                    {{ session.status }}
                  </UBadge>
                </div>
                <p class="text-sm text-default">
                  {{ session.promptSnippet }}
                </p>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Started: {{ formatDate(session.startedAt) }}</span>
                  <span>Completed: {{ formatDate(session.completedAt) }}</span>
                  <span>Key: {{ session.apiKeyName ?? '—' }}{{ session.apiKeyMasked ? ` (${session.apiKeyMasked})` : '' }}</span>
                </div>
                <p v-if="session.lastError" class="text-sm text-error">
                  {{ session.lastError }}
                </p>
              </div>

              <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" label="Inspect" />
            </div>
          </NuxtLink>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
