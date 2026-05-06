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
    case 'active':
      return 'success'
    case 'rate_limited':
      return 'warning'
    case 'invalid':
    case 'exhausted':
      return 'error'
    default:
      return 'neutral'
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
  if (!confirm('Delete this API key?')) {
    return
  }

  try {
    await $fetch(`/api/keys/${id}`, { method: 'DELETE' })
    toast.add({ title: 'API key removed' })
    if (editingId.value === id) {
      resetForm()
    }
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
  if (targetIndex < 0 || targetIndex >= current.length) {
    return
  }

  const [item] = current.splice(index, 1)
  if (!item) {
    return
  }

  current.splice(targetIndex, 0, item)

  await $fetch('/api/keys/reorder', {
    method: 'POST',
    body: {
      orderedIds: current.map(entry => entry.id)
    }
  })

  await refresh()
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
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

            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">Organization ID</label>
              <UInput v-model="form.orgId" class="w-full" size="lg" placeholder="org_..." required />
            </div>

            <div class="grid gap-2">
              <label class="block text-sm font-medium text-highlighted">
                {{ editingId ? 'API key (leave blank to keep current)' : 'API key' }}
              </label>
              <UTextarea
                v-model="form.apiKey"
                class="w-full"
                placeholder="cog_..."
                :required="!editingId"
                :rows="4"
              />
              <p class="text-xs text-muted">
                Keys stay local and are masked everywhere in the UI.
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
              class="rounded-xl border border-default bg-default px-4 py-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-highlighted">
                      {{ key.name }}
                    </p>
                    <UBadge :color="badgeColor(key.status)" variant="subtle" class="capitalize">
                      {{ key.status.replace('_', ' ') }}
                    </UBadge>
                  </div>
                  <div class="space-y-1 text-sm text-muted">
                    <p><span class="font-medium text-default">Org:</span> {{ key.orgId }}</p>
                    <p><span class="font-medium text-default">Masked key:</span> {{ key.maskedKey }}</p>
                    <p><span class="font-medium text-default">Last used:</span> {{ formatDate(key.lastUsedAt) }}</p>
                    <p v-if="key.cooldownUntil"><span class="font-medium text-default">Cooldown until:</span> {{ formatDate(key.cooldownUntil) }}</p>
                    <p v-if="key.lastError" class="text-error">{{ key.lastError }}</p>
                  </div>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UButton color="neutral" variant="outline" icon="i-lucide-arrow-up" :disabled="index === 0" @click="moveKey(index, -1)" />
                  <UButton color="neutral" variant="outline" icon="i-lucide-arrow-down" :disabled="index === keys.length - 1" @click="moveKey(index, 1)" />
                  <UButton color="neutral" variant="outline" label="Edit" @click="beginEdit(key)" />
                  <UButton color="error" variant="soft" label="Delete" @click="removeKey(key.id)" />
                </div>
              </div>
            </div>
          </div>
        </UPageCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
