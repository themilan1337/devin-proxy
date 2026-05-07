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
}, {
  label: 'API Docs',
  icon: 'i-lucide-book-open',
  to: '/docs',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Chat',
  icon: 'i-lucide-message-square',
  to: '/chat',
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
      :ui="{
        header: 'px-3 pt-3 pb-1 lg:px-4 lg:pt-4 lg:pb-1',
        body: 'px-3 pb-3 lg:px-4 lg:pb-4',
        footer: 'px-3 py-3 lg:px-4 lg:py-4 lg:border-t lg:border-default'
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/"
          class="border-default/70 bg-default text-highlighted transition-all duration-200 hover:border-primary/30 hover:bg-elevated/60"
          :class="collapsed
            ? 'mx-auto flex size-9 items-center justify-center rounded-xl border'
            : 'flex items-center rounded-xl border px-3.5 py-3'"
          @click="open = false"
        >
          <NuxtImg src="/devin.png" alt="Devin Proxy Hub" class="size-5 shrink-0" />
          <p
            v-if="!collapsed"
            class="my-auto ml-2 truncate text-sm font-semibold leading-none text-highlighted"
          >
            Devin Proxy Hub
          </p>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          class="mt-1"
          :collapsed="collapsed"
          :items="navigation[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="space-y-3">
          <UButton
            color="neutral"
            variant="outline"
            :block="!collapsed"
            :square="collapsed"
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :label="collapsed ? undefined : colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
            :ui="collapsed ? { base: 'mx-auto flex size-9 items-center justify-center' } : undefined"
            @click="toggleColorMode"
          />

          <div v-if="!collapsed" class="rounded-xl border border-default px-3 py-3 text-xs text-muted">
            Requests to <code class="font-mono text-highlighted">/v1/chat/completions</code> are translated into Devin sessions and tracked locally.
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
