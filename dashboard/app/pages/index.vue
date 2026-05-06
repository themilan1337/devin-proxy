<script setup lang="ts">
import type { ApiKeyListItem, OverviewStats, ProxySessionListItem, ProxySessionStatus } from '~/utils/types'

const fallbackStats: OverviewStats = {
  activeSessions: 0,
  totalSessions: 0,
  availableKeys: 0,
  rateLimitedKeys: 0
}

const { data: overview, refresh, status } = await useFetch<{
  stats: OverviewStats
  keys: ApiKeyListItem[]
  sessions: ProxySessionListItem[]
}>('/api/overview', {
  default: () => ({
    stats: fallbackStats,
    keys: [],
    sessions: []
  })
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

const statCards = computed(() => [{
  label: 'Active sessions',
  value: overview.value.stats.activeSessions,
  icon: 'i-lucide-loader-circle'
}, {
  label: 'Total sessions',
  value: overview.value.stats.totalSessions,
  icon: 'i-lucide-list-checks'
}, {
  label: 'Available keys',
  value: overview.value.stats.availableKeys,
  icon: 'i-lucide-key-round'
}, {
  label: 'Rate-limited keys',
  value: overview.value.stats.rateLimitedKeys,
  icon: 'i-lucide-alert-triangle'
}])

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
  <UDashboardPanel id="overview">
    <template #header>
      <UDashboardNavbar title="Overview">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" label="Refresh" @click="() => refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UPageCard
            v-for="card in statCards"
            :key="card.label"
            :title="card.label"
            variant="subtle"
          >
            <div class="flex items-center justify-between gap-4">
              <p class="text-3xl font-semibold text-highlighted">
                {{ card.value }}
              </p>
              <div class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UIcon :name="card.icon" class="size-5" />
              </div>
            </div>
          </UPageCard>
        </div>

        <UPageCard
          title="Recent proxy requests"
          description="This list refreshes automatically while the dashboard is open."
          variant="subtle"
        >
          <div v-if="status === 'pending'" class="space-y-3">
            <div v-for="placeholder in 3" :key="placeholder" class="h-24 rounded-xl border border-default bg-elevated/40" />
          </div>

          <div v-else-if="!overview.sessions.length" class="rounded-xl border border-dashed border-default p-8 text-sm text-muted">
            No proxy activity yet. Once a client calls <code class="font-mono text-highlighted">/v1/chat/completions</code>, sessions will appear here.
          </div>

          <div v-else class="space-y-3">
            <NuxtLink
              v-for="session in overview.sessions"
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
                    <span>Key: {{ session.apiKeyName ?? '—' }}{{ session.apiKeyMasked ? ` (${session.apiKeyMasked})` : '' }}</span>
                  </div>
                </div>
                <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" label="Inspect" />
              </div>
            </NuxtLink>
          </div>
        </UPageCard>

        <UPageCard title="Key health snapshot" variant="subtle">
          <div v-if="!overview.keys.length" class="rounded-xl border border-dashed border-default p-6 text-sm text-muted">
            No keys configured.
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="key in overview.keys" :key="key.id" class="rounded-xl border border-default bg-default px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-highlighted">
                  {{ key.name }}
                </p>
                <UBadge variant="subtle" :color="key.status === 'active' ? 'success' : key.status === 'rate_limited' ? 'warning' : 'error'" class="capitalize">
                  {{ key.status.replace('_', ' ') }}
                </UBadge>
              </div>
              <div class="mt-3 space-y-1 text-sm text-muted">
                <p>{{ key.maskedKey }}</p>
                <p>{{ key.orgId }}</p>
              </div>
            </div>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
