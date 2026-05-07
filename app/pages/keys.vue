<script setup lang="ts">
import type { ApiKeyListItem, ApiKeyStatus } from '~/utils/types'

const toast = useToast()

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Rate limited', value: 'rate_limited' },
  { label: 'Invalid', value: 'invalid' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Exhausted', value: 'exhausted' }
]

const form = reactive({
  name: '',
  orgId: '',
  apiKey: '',
  status: 'active' as ApiKeyStatus
})

const editingId = ref<number | null>(null)
const checkingId = ref<number | null>(null)

interface CheckResult {
  valid: boolean
  httpStatus?: number
  status?: string
  message: string
  bodySnippet?: string
  hint?: string
  detectedOrgId?: string
  selfInfo?: {
    principal_type?: string
    service_user_id?: string
    service_user_name?: string
    org_id?: string | null
  }
}

// Per-key inline check results — shown under each card after a check.
const checkResults = ref(new Map<number, CheckResult>())

function hasCheckResult(id: number) { return checkResults.value.has(id) }
function getCheckResult(id: number): CheckResult { return checkResults.value.get(id)! }

const { data: keys, refresh, status } = await useFetch<ApiKeyListItem[]>('/api/keys', {
  default: () => []
})

function resetForm() {
  editingId.value = null
  form.name = ''
  form.orgId = ''
  form.apiKey = ''
  form.status = 'active'
}

function beginEdit(key: ApiKeyListItem) {
  editingId.value = key.id
  form.name = key.name
  form.orgId = key.orgId
  form.apiKey = ''
  form.status = key.status
}

function badgeColor(value: ApiKeyStatus) {
  switch (value) {
    case 'active': return 'success'
    case 'rate_limited': return 'warning'
    case 'invalid':
    case 'exhausted': return 'error'
    default: return 'neutral'
  }
}

async function submit() {
  try {
    if (editingId.value) {
      await $fetch(`/api/keys/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: form.name,
          orgId: form.orgId,
          apiKey: form.apiKey || undefined,
          status: form.status
        }
      })
      toast.add({ title: 'API key updated' })
    } else {
      await $fetch('/api/keys', {
        method: 'POST',
        body: {
          name: form.name,
          orgId: form.orgId,
          apiKey: form.apiKey,
          status: form.status
        }
      })
      toast.add({ title: 'API key added' })
    }

    resetForm()
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Could not save API key',
      description: error instanceof Error ? error.message : 'Unexpected error.',
      color: 'error'
    })
  }
}

async function removeKey(id: number) {
  if (!confirm('Delete this API key?')) return

  try {
    await $fetch(`/api/keys/${id}`, { method: 'DELETE' })
    toast.add({ title: 'API key removed' })
    if (editingId.value === id) resetForm()
    checkResults.value.delete(id)
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Could not delete API key',
      description: error instanceof Error ? error.message : 'Unexpected error.',
      color: 'error'
    })
  }
}

async function moveKey(index: number, direction: -1 | 1) {
  const current = [...keys.value]
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= current.length) return

  const [item] = current.splice(index, 1)
  if (!item) return

  current.splice(targetIndex, 0, item)

  await $fetch('/api/keys/reorder', {
    method: 'POST',
    body: { orderedIds: current.map(entry => entry.id) }
  })

  await refresh()
}

async function checkKey(id: number) {
  checkingId.value = id
  checkResults.value.delete(id)

  try {
    const result = await $fetch<CheckResult>(`/api/keys/${id}/check`, { method: 'POST' })
    checkResults.value.set(id, result)
    await refresh()

    if (result.valid) {
      toast.add({
        title: 'Key is valid',
        description: 'Credentials accepted by Devin. Key restored to active.',
        color: 'success'
      })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unexpected error.'
    checkResults.value.set(id, { valid: false, status: 'error', message: msg })
    toast.add({ title: 'Check failed', description: msg, color: 'error' })
  } finally {
    checkingId.value = null
  }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}

function isUnhealthy(s: ApiKeyStatus) {
  return s === 'invalid' || s === 'rate_limited' || s === 'exhausted' || s === 'disabled'
}
</script>

<template>
  <UDashboardPanel id="keys">
    <template #header>
      <UDashboardNavbar title="API Keys">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto grid w-full max-w-7xl gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <!-- ── Add / Edit form ──────────────────────────────────────── -->
        <UPageCard
          :title="editingId ? 'Edit Devin key' : 'Add Devin key'"
          description="Store keys locally. The dashboard never returns raw secrets back to the browser."
          variant="subtle"
          :ui="{
            root: 'rounded-2xl',
            container: 'p-6 sm:p-7',
            header: 'mb-6',
            title: 'text-base font-semibold text-highlighted',
            description: 'mt-2 text-sm leading-6 text-muted'
          }"
        >
          <form class="space-y-5" @submit.prevent="submit">
            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">Name</label>
              <UInput v-model="form.name" class="w-full" size="lg" placeholder="Primary org key" required />
            </div>

            <!-- v1 / v3 toggle -->
            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">API version</label>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
                  :class="!form.orgId ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-default text-muted hover:border-primary/40'"
                  @click="form.orgId = ''"
                >
                  v1 — Personal key
                  <span class="ml-1 text-xs opacity-70">(Pro subscription)</span>
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors"
                  :class="form.orgId ? 'border-primary bg-primary/10 font-medium text-primary' : 'border-default text-muted hover:border-primary/40'"
                  @click="form.orgId = form.orgId || 'org-'"
                >
                  v3 — Service user
                  <span class="ml-1 text-xs opacity-70">(org billing)</span>
                </button>
              </div>
              <p class="text-xs text-muted">
                <strong>v1:</strong> your personal Devin Pro key — no org ID needed, uses your own subscription quota.<br>
                <strong>v3:</strong> service user token tied to an organization, requires org billing.
              </p>
            </div>

            <div v-if="form.orgId !== ''" class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">Organization ID</label>
              <UInput v-model="form.orgId" class="w-full" size="lg" placeholder="org-xxxxxxxxxxxxxxxx" />
              <p class="text-xs text-muted">
                Found in Devin → Settings → Service users.
                Copy it exactly as shown (e.g. <code class="font-mono text-highlighted">org-4a27c241…</code>).
              </p>
            </div>

            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">
                {{ editingId ? 'API key (leave blank to keep current)' : (form.orgId ? 'Service user token' : 'Personal API key') }}
              </label>
              <UTextarea
                v-model="form.apiKey"
                class="w-full"
                :placeholder="form.orgId
                  ? 'Paste the service user token (cog_…) from Devin → Settings → Service users'
                  : 'Paste your personal API key (apk_user_…) from Devin → Settings → API keys'"
                :required="!editingId"
                :rows="3"
              />
              <p class="text-xs text-muted">
                {{
                  form.orgId
                    ? 'Create a service user in Devin → Settings → Service users, then copy its token here.'
                    : 'Find your personal key at app.devin.ai → Settings → API keys → Reveal.'
                }}
                The raw value is never returned to the browser.
              </p>
            </div>

            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">Status</label>
              <USelect v-model="form.status" class="w-full" size="lg" :items="statusOptions" />
            </div>

            <div class="flex flex-wrap gap-3 pt-2">
              <UButton type="submit" size="lg" :label="editingId ? 'Save changes' : 'Add key'" />
              <UButton type="button" color="neutral" variant="outline" label="Reset" @click="resetForm" />
            </div>
          </form>
        </UPageCard>

        <!-- ── Rotation order list ─────────────────────────────────── -->
        <UPageCard
          title="Rotation order"
          description="Keys are tried from top to bottom. Rate-limited or exhausted keys are skipped automatically."
          variant="subtle"
          :ui="{
            root: 'rounded-2xl',
            container: 'p-6 sm:p-7',
            header: 'mb-6',
            title: 'text-base font-semibold text-highlighted',
            description: 'mt-2 text-sm leading-6 text-muted'
          }"
        >
          <div v-if="status === 'pending'" class="space-y-3">
            <div v-for="placeholder in 3" :key="placeholder" class="h-24 rounded-xl border border-default bg-elevated/40" />
          </div>

          <div v-else-if="!keys.length" class="rounded-xl border border-dashed border-default p-6 text-sm text-muted">
            No Devin API keys stored yet.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(key, index) in keys"
              :key="key.id"
              class="overflow-hidden rounded-xl border transition-colors"
              :class="isUnhealthy(key.status)
                ? 'border-error/30 bg-error/[0.02]'
                : 'border-default bg-default'"
            >
              <!-- Main row -->
              <div class="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                <div class="min-w-0 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-highlighted">
                      {{ key.name }}
                    </p>
                    <UBadge :color="badgeColor(key.status)" variant="subtle" class="capitalize">
                      {{ key.status.replace('_', ' ') }}
                    </UBadge>
                    <UBadge :color="key.orgId ? 'neutral' : 'primary'" variant="soft" class="text-xs">
                      {{ key.orgId ? 'v3' : 'v1' }}
                    </UBadge>
                    <span v-if="key.cooldownUntil" class="text-xs text-warning">
                      cooldown until {{ formatDate(key.cooldownUntil) }}
                    </span>
                  </div>
                  <div class="space-y-0.5 text-sm text-muted">
                    <p v-if="key.orgId">
                      <span class="font-medium text-default">Org:</span>
                      <code class="ml-1 font-mono text-xs text-highlighted">{{ key.orgId }}</code>
                    </p>
                    <p v-else class="text-xs text-primary/70">Personal key — v1 API (uses your Pro subscription)</p>
                    <p>
                      <span class="font-medium text-default">Token:</span>
                      <code class="ml-1 font-mono text-xs">{{ key.maskedKey }}</code>
                    </p>
                    <p>
                      <span class="font-medium text-default">Last used:</span>
                      {{ formatDate(key.lastUsedAt) }}
                    </p>
                  </div>
                </div>

                <div class="flex shrink-0 flex-wrap gap-2">
                  <UButton color="neutral" variant="outline" icon="i-lucide-arrow-up" :disabled="index === 0" @click="moveKey(index, -1)" />
                  <UButton color="neutral" variant="outline" icon="i-lucide-arrow-down" :disabled="index === keys.length - 1" @click="moveKey(index, 1)" />
                  <UButton
                    :color="isUnhealthy(key.status) ? 'warning' : 'neutral'"
                    :variant="isUnhealthy(key.status) ? 'soft' : 'outline'"
                    :icon="checkingId === key.id ? 'i-lucide-loader-circle' : 'i-lucide-shield-check'"
                    :label="isUnhealthy(key.status) ? 'Test & restore' : 'Check'"
                    :loading="checkingId === key.id"
                    :disabled="checkingId !== null"
                    @click="checkKey(key.id)"
                  />
                  <UButton color="neutral" variant="outline" label="Edit" @click="beginEdit(key)" />
                  <UButton color="error" variant="soft" label="Delete" @click="removeKey(key.id)" />
                </div>
              </div>

              <!-- ── Error banner (lastError from previous session attempt) ── -->
              <div
                v-if="key.lastError && !hasCheckResult(key.id)"
                class="flex items-start gap-3 border-t border-error/20 bg-error/5 px-4 py-3"
              >
                <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-3.5 shrink-0 text-error" />
                <div class="min-w-0 flex-1 space-y-1">
                  <p class="text-xs font-medium text-error">
                    Last error from Devin API
                  </p>
                  <p class="break-words font-mono text-xs text-error/80">
                    {{ key.lastError }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    Click <strong>Test &amp; restore</strong> to re-check the key against Devin and automatically restore it if valid.
                  </p>
                </div>
              </div>

              <!-- ── Inline check result ─────────────────────────────────── -->
              <template v-if="hasCheckResult(key.id)">
                <div
                  class="border-t px-4 py-3"
                  :class="getCheckResult(key.id).valid
                    ? 'border-success/20 bg-success/5'
                    : getCheckResult(key.id).status === 'org_mismatch'
                      ? 'border-warning/20 bg-warning/5'
                      : 'border-error/20 bg-error/5'"
                >
                  <div class="flex items-start gap-3">
                    <UIcon
                      :name="getCheckResult(key.id).valid
                        ? 'i-lucide-shield-check'
                        : getCheckResult(key.id).status === 'org_mismatch'
                          ? 'i-lucide-alert-triangle'
                          : 'i-lucide-shield-x'"
                      class="mt-0.5 size-3.5 shrink-0"
                      :class="getCheckResult(key.id).valid
                        ? 'text-success'
                        : getCheckResult(key.id).status === 'org_mismatch'
                          ? 'text-warning'
                          : 'text-error'"
                    />
                    <div class="min-w-0 flex-1 space-y-1.5">
                      <div class="flex items-center gap-2">
                        <p
                          class="text-xs font-semibold"
                          :class="getCheckResult(key.id).valid
                            ? 'text-success'
                            : getCheckResult(key.id).status === 'org_mismatch'
                              ? 'text-warning'
                              : 'text-error'"
                        >
                          {{ getCheckResult(key.id).valid
                            ? 'Valid'
                            : getCheckResult(key.id).status === 'org_mismatch'
                              ? 'Wrong org ID'
                              : 'Invalid' }}
                          <span v-if="getCheckResult(key.id).httpStatus" class="ml-1 font-normal opacity-70">
                            HTTP {{ getCheckResult(key.id).httpStatus }}
                          </span>
                        </p>
                      </div>
                      <p class="text-xs text-default">
                        {{ getCheckResult(key.id).message }}
                      </p>
                      <!-- Org mismatch: show the correct org ID prominently -->
                      <div
                        v-if="getCheckResult(key.id).status === 'org_mismatch' && getCheckResult(key.id).detectedOrgId"
                        class="mt-1.5 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2"
                      >
                        <UIcon name="i-lucide-key" class="size-3 shrink-0 text-warning" />
                        <span class="text-xs text-warning">
                          Correct org ID:
                          <code class="ml-1 font-mono font-medium">{{ getCheckResult(key.id).detectedOrgId }}</code>
                        </span>
                        <UButton
                          size="xs"
                          color="warning"
                          variant="ghost"
                          label="Use this"
                          class="ml-auto"
                          @click="() => { beginEdit(key); form.orgId = getCheckResult(key.id).detectedOrgId! }"
                        />
                      </div>
                      <!-- Valid: show service user info -->
                      <div
                        v-if="getCheckResult(key.id).valid && getCheckResult(key.id).selfInfo?.service_user_name"
                        class="text-xs text-success/80"
                      >
                        Authenticated as: <span class="font-medium">{{ getCheckResult(key.id).selfInfo!.service_user_name }}</span>
                      </div>
                      <!-- Actionable hint -->
                      <p
                        v-if="getCheckResult(key.id).hint && getCheckResult(key.id).status !== 'org_mismatch'"
                        class="flex items-start gap-1.5 text-xs text-warning"
                      >
                        <UIcon name="i-lucide-lightbulb" class="mt-0.5 size-3 shrink-0" />
                        {{ getCheckResult(key.id).hint }}
                      </p>
                      <!-- Raw body snippet for debugging -->
                      <details v-if="getCheckResult(key.id).bodySnippet" class="mt-1">
                        <summary class="cursor-pointer text-xs text-muted hover:text-default">
                          Show raw Devin response
                        </summary>
                        <pre class="mt-1.5 overflow-x-auto rounded-lg bg-neutral-900 px-3 py-2 font-mono text-[10px] text-neutral-300 dark:bg-neutral-950">{{ getCheckResult(key.id).bodySnippet }}</pre>
                      </details>
                    </div>
                    <!-- Dismiss -->
                    <button
                      class="shrink-0 text-muted hover:text-default"
                      @click="checkResults.delete(key.id)"
                    >
                      <UIcon name="i-lucide-x" class="size-3.5" />
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
