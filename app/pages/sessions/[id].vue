<script setup lang="ts">
import type { ProxySessionDetail, ProxySessionStatus } from '~/utils/types'

const route = useRoute()

const endpoint = computed(() => `/api/sessions/${route.params.id}`)

const { data: session, refresh, status } = await useFetch<ProxySessionDetail>(endpoint, {
  watch: [endpoint]
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

const latestPayload = computed(() => JSON.stringify(session.value?.rawLatestPayload ?? {}, null, 2))
</script>

<template>
  <UDashboardPanel id="session-detail">
    <template #header>
      <UDashboardNavbar :title="`Session #${route.params.id}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" label="Refresh" @click="() => refresh()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="status === 'pending'" class="space-y-4">
        <div class="h-32 rounded-xl border border-default bg-elevated/40" />
        <div class="h-72 rounded-xl border border-default bg-elevated/40" />
      </div>

      <div v-else-if="!session" class="rounded-xl border border-dashed border-default p-8 text-sm text-muted">
        Session not found.
      </div>

      <div v-else class="space-y-6">
        <UPageCard title="Summary" variant="subtle">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-xl border border-default px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-muted">
                Status
              </p>
              <UBadge :color="statusColor(session.status)" variant="subtle" class="mt-2 capitalize">
                {{ session.status }}
              </UBadge>
            </div>
            <div class="rounded-xl border border-default px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-muted">
                Devin session
              </p>
              <p class="mt-2 text-sm text-default">
                {{ session.devinSessionId ?? 'Pending' }}
              </p>
            </div>
            <div class="rounded-xl border border-default px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-muted">
                Started
              </p>
              <p class="mt-2 text-sm text-default">
                {{ formatDate(session.startedAt) }}
              </p>
            </div>
            <div class="rounded-xl border border-default px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-muted">
                Completed
              </p>
              <p class="mt-2 text-sm text-default">
                {{ formatDate(session.completedAt) }}
              </p>
            </div>
          </div>

          <div class="mt-4 space-y-2 text-sm text-muted">
            <p><span class="font-medium text-default">Key:</span> {{ session.apiKeyName ?? '—' }}{{ session.apiKeyMasked ? ` (${session.apiKeyMasked})` : '' }}</p>
            <p><span class="font-medium text-default">Client IP:</span> {{ session.clientIp ?? 'Unavailable' }}</p>
            <p><span class="font-medium text-default">Last polled:</span> {{ formatDate(session.lastPolledAt) }}</p>
            <p v-if="session.devinUrl"><span class="font-medium text-default">Devin URL:</span> <a :href="session.devinUrl" target="_blank" class="text-primary underline underline-offset-4">Open session</a></p>
            <p v-if="session.lastError" class="text-error">{{ session.lastError }}</p>
          </div>
        </UPageCard>

        <UPageCard title="Original prompt" variant="subtle">
          <pre class="overflow-x-auto whitespace-pre-wrap text-sm text-default">{{ session.originalPrompt }}</pre>
        </UPageCard>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <UPageCard title="Event log" variant="subtle">
            <div v-if="!session.events.length" class="text-sm text-muted">
              No structured events recorded yet.
            </div>
            <div v-else class="space-y-3">
              <div v-for="event in session.events" :key="event.id" class="rounded-xl border border-default px-4 py-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <UBadge color="neutral" variant="subtle">
                      {{ event.eventType }}
                    </UBadge>
                    <span class="text-sm font-medium text-highlighted">#{{ event.sequence }}</span>
                  </div>
                  <span class="text-xs text-muted">{{ formatDate(event.createdAt) }}</span>
                </div>
                <p v-if="event.summary" class="mt-2 text-sm text-default">
                  {{ event.summary }}
                </p>
                <pre v-if="event.payload" class="mt-3 overflow-x-auto rounded-lg bg-elevated/50 p-3 text-xs text-default">{{ JSON.stringify(event.payload, null, 2) }}</pre>
              </div>
            </div>
          </UPageCard>

          <UPageCard title="Latest raw payload" variant="subtle">
            <pre class="max-h-[720px] overflow-auto rounded-xl bg-elevated/50 p-4 text-xs text-default">{{ latestPayload }}</pre>
          </UPageCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
