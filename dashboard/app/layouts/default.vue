<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const colorMode = useColorMode()
const open = ref(false)

const navigation = [[{
  label: 'Overview',
  icon: 'i-lucide-layout-dashboard',
  to: '/',
  exact: true,
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'API Keys',
  icon: 'i-lucide-key-round',
  to: '/keys',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Sessions',
  icon: 'i-lucide-activity',
  to: '/sessions',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/30"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header>
        <div class="flex items-center gap-3 rounded-xl border border-default bg-default px-3 py-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-inverted">
            <UIcon name="i-lucide-bot" class="size-5" />
          </div>
          <div>
            <p class="text-sm font-semibold text-highlighted">
              Devin Proxy Hub
            </p>
            <p class="text-xs text-muted">
              Local OpenAI-compatible bridge
            </p>
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigation[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer>
        <div class="space-y-3">
          <UButton
            color="neutral"
            variant="outline"
            block
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
            @click="toggleColorMode"
          />
          <div class="rounded-xl border border-default px-3 py-3 text-xs text-muted">
            Requests to <code class="font-mono text-highlighted">/v1/chat/completions</code> are translated into Devin sessions and tracked locally.
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
