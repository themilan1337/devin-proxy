<script setup lang="ts">
const { copy } = useClipboard({ legacy: true })
const copiedId = ref<string | null>(null)

function copyText(id: string, text: string) {
  copy(text)
  copiedId.value = id
  setTimeout(() => { copiedId.value = null }, 2000)
}

const openEndpoints = ref<Record<string, boolean>>({ 'post-completions': true })

function toggle(id: string) {
  openEndpoints.value[id] = !openEndpoints.value[id]
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

const methodBadge: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
}

const methodBorder: Record<HttpMethod, string> = {
  GET: 'border-l-emerald-400 dark:border-l-emerald-600',
  POST: 'border-l-blue-400 dark:border-l-blue-600',
  PATCH: 'border-l-amber-400 dark:border-l-amber-600',
  DELETE: 'border-l-red-400 dark:border-l-red-600'
}

const methodHeaderBg: Record<HttpMethod, string> = {
  GET: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
  POST: 'hover:bg-blue-50/60 dark:hover:bg-blue-950/20',
  PATCH: 'hover:bg-amber-50/60 dark:hover:bg-amber-950/20',
  DELETE: 'hover:bg-red-50/60 dark:hover:bg-red-950/20'
}

const activeSectionId = ref('docs-intro')

const tocItems = [
  { id: 'docs-intro', label: 'Introduction' },
  { id: 'docs-quickstart', label: 'Quick Start' },
  { id: 'docs-config', label: 'Configuration' },
  { id: 'docs-proxy', label: 'Proxy API', indent: false },
  { id: 'docs-keys', label: 'API Keys' },
  { id: 'docs-sessions', label: 'Sessions' },
  { id: 'docs-overview', label: 'Overview' },
  { id: 'docs-integrations', label: 'Integrations' }
]

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    activeSectionId.value = id
  }
}

const integrationTab = ref<'opencode' | 'python' | 'nodejs' | 'curl'>('opencode')

// ─── Code snippets ───────────────────────────────────────────────────────────

const CODE = {
  install: 'pnpm install',
  envSetup: 'cp .env.example .env',
  devStart: 'pnpm dev',

  curlFirstRequest: `curl http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "devin-proxy-hub",
    "stream": false,
    "messages": [
      { "role": "user", "content": "Explain the latest CI failure" }
    ]
  }'`,

  completionRequestBody: `{
  "model": "devin-proxy-hub",
  "stream": false,
  "messages": [
    {
      "role": "system",
      "content": "You are working in the monorepo at /home/ubuntu/repo."
    },
    {
      "role": "user",
      "content": "Fix the TypeScript error in packages/core/src/index.ts"
    }
  ]
}`,

  completionResponse: `{
  "id": "chatcmpl-7f3e2a1b-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
  "object": "chat.completion",
  "created": 1715000000,
  "model": "devin-proxy-hub",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I've analyzed the TypeScript error and applied the fix..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": null
}`,

  streamResponse: `data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1715000000,"model":"devin-proxy-hub","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1715000000,"model":"devin-proxy-hub","choices":[{"index":0,"delta":{"content":"I've analyzed..."},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","object":"chat.completion.chunk","created":1715000000,"model":"devin-proxy-hub","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]`,

  createKeyBody: `{
  "name": "Production Key",
  "apiKey": "your-devin-api-key-here",
  "orgId": "org_xxxxxxxxxxxxxxxxxx",
  "status": "active"
}`,

  keyResponse: `{
  "id": 1,
  "name": "Production Key",
  "orgId": "org_xxxxxxxxxxxxxxxxxx",
  "maskedKey": "your...here",
  "status": "active",
  "orderIndex": 0,
  "cooldownUntil": null,
  "lastError": null,
  "lastUsedAt": "2024-05-01T10:05:00.000Z",
  "createdAt": "2024-04-01T00:00:00.000Z",
  "updatedAt": "2024-05-01T10:05:00.000Z"
}`,

  keyListResponse: `[
  {
    "id": 1,
    "name": "Production Key",
    "orgId": "org_xxxxxxxxxxxxxxxxxx",
    "maskedKey": "your...here",
    "status": "active",
    "orderIndex": 0,
    "cooldownUntil": null,
    "lastError": null,
    "lastUsedAt": "2024-05-01T10:05:00.000Z",
    "createdAt": "2024-04-01T00:00:00.000Z",
    "updatedAt": "2024-05-01T10:05:00.000Z"
  }
]`,

  patchKeyBody: `{
  "name": "Renamed Key",
  "status": "disabled"
}`,

  reorderBody: `{
  "orderedIds": [3, 1, 2]
}`,

  sessionListResponse: `[
  {
    "id": 42,
    "devinSessionId": "dvsn_abc123",
    "devinUrl": "https://app.devin.ai/sessions/abc123",
    "status": "finished",
    "promptSnippet": "Fix the TypeScript error in packages/core...",
    "apiKeyName": "Production Key",
    "apiKeyMasked": "your...here",
    "startedAt": "2024-05-01T10:00:00.000Z",
    "completedAt": "2024-05-01T10:05:00.000Z",
    "lastPolledAt": "2024-05-01T10:05:00.000Z",
    "lastError": null,
    "updatedAt": "2024-05-01T10:05:00.000Z"
  }
]`,

  sessionDetailResponse: `{
  "id": 42,
  "devinSessionId": "dvsn_abc123",
  "devinUrl": "https://app.devin.ai/sessions/abc123",
  "status": "finished",
  "promptSnippet": "Fix the TypeScript error in packages/core...",
  "originalPrompt": "You are operating behind an OpenAI-compatible proxy...\\n\\nMessage 1\\nRole: user\\nFix the TypeScript error...",
  "clientIp": "127.0.0.1",
  "apiKeyName": "Production Key",
  "apiKeyMasked": "your...here",
  "startedAt": "2024-05-01T10:00:00.000Z",
  "completedAt": "2024-05-01T10:05:00.000Z",
  "lastPolledAt": "2024-05-01T10:05:00.000Z",
  "lastError": null,
  "updatedAt": "2024-05-01T10:05:00.000Z",
  "rawLatestPayload": {
    "status": "finished",
    "structured_output": "..."
  },
  "events": [
    {
      "id": 1,
      "sessionId": 42,
      "sequence": 0,
      "eventType": "message",
      "summary": "Starting analysis of TypeScript error...",
      "payload": { "type": "message", "content": "..." },
      "createdAt": "2024-05-01T10:00:00.000Z"
    }
  ]
}`,

  overviewResponse: `{
  "stats": {
    "activeSessions": 2,
    "totalSessions": 47,
    "availableKeys": 3,
    "rateLimitedKeys": 0
  },
  "keys": [ /* ApiKeyListItem[] */ ],
  "sessions": [ /* ProxySessionListItem[] — latest 12 */ ]
}`,

  openCodeConfig: `// opencode.json (project root)
{
  "model": {
    "id": "devin-proxy-hub",
    "name": "Devin (via Proxy)",
    "provider": "openai",
    "apiKey": "any-non-empty-value",
    "baseURL": "http://localhost:3000/v1"
  }
}`,

  pythonCode: `from openai import OpenAI

client = OpenAI(
    api_key="any-non-empty-value",
    base_url="http://localhost:3000/v1",
)

response = client.chat.completions.create(
    model="devin-proxy-hub",
    stream=False,
    messages=[
        {
            "role": "system",
            "content": "Working in the monorepo at /home/ubuntu/repo.",
        },
        {
            "role": "user",
            "content": "Fix the failing test in packages/core/src/index.test.ts",
        },
    ],
)

print(response.choices[0].message.content)`,

  nodejsCode: `import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: 'any-non-empty-value',
  baseURL: 'http://localhost:3000/v1',
})

const response = await client.chat.completions.create({
  model: 'devin-proxy-hub',
  stream: false,
  messages: [
    {
      role: 'system',
      content: 'Working in the monorepo at /home/ubuntu/repo.',
    },
    {
      role: 'user',
      content: 'Fix the failing test in packages/core/src/index.test.ts',
    },
  ],
})

console.log(response.choices[0].message.content)`,

  curlIntegration: `curl http://localhost:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "devin-proxy-hub",
    "stream": false,
    "messages": [
      {
        "role": "system",
        "content": "Working in the monorepo at /home/ubuntu/repo."
      },
      {
        "role": "user",
        "content": "Fix the failing test in packages/core/src/index.test.ts"
      }
    ]
  }'`
}
</script>

<template>
  <UDashboardPanel id="docs">
    <template #header>
      <UDashboardNavbar title="API Reference">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex gap-10 pb-32">
        <!-- ── Sticky TOC ────────────────────────────────────────────────── -->
        <aside class="hidden xl:block w-48 shrink-0">
          <div class="sticky top-6 space-y-0.5">
            <p class="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted">
              Contents
            </p>
            <button
              v-for="item in tocItems"
              :key="item.id"
              class="w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors"
              :class="activeSectionId === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted hover:bg-elevated/60 hover:text-default'"
              @click="scrollTo(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </aside>

        <!-- ── Main content ──────────────────────────────────────────────── -->
        <div class="min-w-0 flex-1 space-y-16">
          <!-- ── Banner ────────────────────────────────────────────────── -->
          <div class="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-primary/[0.02] px-8 py-8">
            <div class="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div class="mb-4 flex items-center gap-3">
                  <div class="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <NuxtImg src="/devin.png" alt="Devin Proxy Hub" class="size-6" />
                  </div>
                  <div>
                    <h1 class="text-2xl font-bold text-highlighted">
                      Devin Proxy Hub
                    </h1>
                    <p class="text-sm text-muted">
                      OpenAI-Compatible Proxy · v1
                    </p>
                  </div>
                </div>
                <p class="max-w-xl text-sm leading-relaxed text-default">
                  A local proxy that accepts <code class="rounded bg-elevated px-1.5 py-0.5 font-mono text-xs text-highlighted">POST /v1/chat/completions</code>
                  requests and translates them into Devin autonomous sessions — streaming, key rotation, and session history included.
                </p>
                <div class="mt-5 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800">
                    <span class="size-1.5 rounded-full bg-emerald-500" />
                    OpenAI Compatible
                  </span>
                  <span class="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-xs font-medium text-default ring-1 ring-default">
                    SSE Streaming
                  </span>
                  <span class="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-xs font-medium text-default ring-1 ring-default">
                    Key Rotation
                  </span>
                  <span class="inline-flex items-center rounded-full bg-elevated px-3 py-1 text-xs font-medium text-default ring-1 ring-default">
                    SQLite Persistence
                  </span>
                </div>
              </div>
              <div class="shrink-0 rounded-xl border border-default bg-default px-5 py-4">
                <p class="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  Server
                </p>
                <p class="font-mono text-sm font-semibold text-highlighted">
                  http://localhost:3000
                </p>
                <p class="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  Proxy route
                </p>
                <p class="font-mono text-sm text-default">
                  POST /v1/chat/completions
                </p>
              </div>
            </div>
          </div>

          <!-- ── Introduction ──────────────────────────────────────────── -->
          <section id="docs-intro">
            <h2 class="mb-5 text-lg font-bold text-highlighted">
              Introduction
            </h2>
            <UPageCard variant="subtle">
              <div class="space-y-4 text-sm leading-relaxed text-default">
                <p>
                  Devin Proxy Hub sits between any OpenAI-compatible client and Devin. When a chat completion request arrives,
                  the proxy compiles the message history into a single prompt, creates a Devin session, polls it until it finishes,
                  and returns the result — either as a standard completion response or as a Server-Sent Events stream.
                </p>
                <p>
                  The proxy manages a pool of Devin API keys and rotates through them automatically. Keys that hit rate limits
                  are put into a configurable cooldown period; invalid or exhausted keys are skipped entirely. Every request,
                  session, and event is persisted to a local SQLite file you control.
                </p>
              </div>
              <div class="mt-6 grid gap-4 sm:grid-cols-3">
                <div class="rounded-xl border border-default bg-default p-4">
                  <div class="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-plug" class="size-4 text-primary" />
                  </div>
                  <p class="text-sm font-semibold text-highlighted">
                    Drop-in replacement
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    Change only the base URL. Every OpenAI SDK works out of the box.
                  </p>
                </div>
                <div class="rounded-xl border border-default bg-default p-4">
                  <div class="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-key-round" class="size-4 text-primary" />
                  </div>
                  <p class="text-sm font-semibold text-highlighted">
                    Automatic key rotation
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    Multiple Devin keys with rate-limit detection and cooldown failover.
                  </p>
                </div>
                <div class="rounded-xl border border-default bg-default p-4">
                  <div class="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <UIcon name="i-lucide-database" class="size-4 text-primary" />
                  </div>
                  <p class="text-sm font-semibold text-highlighted">
                    Full audit trail
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    Every session, event, and raw payload stored in a local SQLite file.
                  </p>
                </div>
              </div>
            </UPageCard>
          </section>

          <!-- ── Quick Start ───────────────────────────────────────────── -->
          <section id="docs-quickstart">
            <h2 class="mb-5 text-lg font-bold text-highlighted">
              Quick Start
            </h2>
            <div class="space-y-3">
              <UPageCard variant="subtle">
                <div class="flex items-start gap-4">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    1
                  </div>
                  <div class="min-w-0 flex-1 space-y-3">
                    <p class="font-semibold text-highlighted">
                      Install dependencies
                    </p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>{{ CODE.install }}</code></pre>
                      <button
                        class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                        @click="copyText('install', CODE.install)"
                      >
                        <UIcon :name="copiedId === 'install' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </UPageCard>

              <UPageCard variant="subtle">
                <div class="flex items-start gap-4">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    2
                  </div>
                  <div class="min-w-0 flex-1 space-y-3">
                    <p class="font-semibold text-highlighted">
                      Configure environment
                    </p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>{{ CODE.envSetup }}</code></pre>
                      <button
                        class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                        @click="copyText('envsetup', CODE.envSetup)"
                      >
                        <UIcon :name="copiedId === 'envsetup' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                    <p class="text-xs text-muted">
                      See the <button class="text-primary underline-offset-2 hover:underline" @click="scrollTo('docs-config')">Configuration</button> section for all available env vars.
                    </p>
                  </div>
                </div>
              </UPageCard>

              <UPageCard variant="subtle">
                <div class="flex items-start gap-4">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    3
                  </div>
                  <div class="min-w-0 flex-1 space-y-3">
                    <p class="font-semibold text-highlighted">
                      Start the server
                    </p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>{{ CODE.devStart }}</code></pre>
                      <button
                        class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                        @click="copyText('devstart', CODE.devStart)"
                      >
                        <UIcon :name="copiedId === 'devstart' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                    <p class="text-xs text-muted">
                      Open <code class="rounded bg-elevated px-1 font-mono text-highlighted">http://localhost:3000</code>
                      and add at least one Devin API key in the
                      <NuxtLink to="/keys" class="text-primary underline-offset-2 hover:underline">API Keys</NuxtLink> page.
                    </p>
                  </div>
                </div>
              </UPageCard>

              <UPageCard variant="subtle">
                <div class="flex items-start gap-4">
                  <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    4
                  </div>
                  <div class="min-w-0 flex-1 space-y-3">
                    <p class="font-semibold text-highlighted">
                      Send your first request
                    </p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.curlFirstRequest }}</code></pre>
                      <button
                        class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                        @click="copyText('first-req', CODE.curlFirstRequest)"
                      >
                        <UIcon :name="copiedId === 'first-req' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </UPageCard>
            </div>
          </section>

          <!-- ── Configuration ─────────────────────────────────────────── -->
          <section id="docs-config">
            <h2 class="mb-5 text-lg font-bold text-highlighted">
              Configuration
            </h2>
            <UPageCard variant="subtle">
              <p class="mb-5 text-sm text-muted">
                All values are read from <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">.env</code>
                at startup. Copy <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">.env.example</code> to get started.
              </p>
              <div class="overflow-x-auto rounded-xl border border-default">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-default bg-elevated/40">
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Variable
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Default
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default">
                    <tr class="bg-default transition-colors hover:bg-elevated/30">
                      <td class="px-4 py-3 font-mono text-xs text-highlighted">
                        NUXT_PUBLIC_SITE_URL
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-muted">
                        —
                      </td>
                      <td class="px-4 py-3 text-xs text-default">
                        Public site URL for SEO metadata. Optional.
                      </td>
                    </tr>
                    <tr class="bg-default transition-colors hover:bg-elevated/30">
                      <td class="px-4 py-3 font-mono text-xs text-highlighted">
                        DEVIN_API_BASE
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-muted">
                        https://api.devin.ai/v3
                      </td>
                      <td class="px-4 py-3 text-xs text-default">
                        Upstream Devin API base URL.
                      </td>
                    </tr>
                    <tr class="bg-default transition-colors hover:bg-elevated/30">
                      <td class="px-4 py-3 font-mono text-xs text-highlighted">
                        DEVIN_PROXY_SQLITE_PATH
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-muted">
                        sqlite.db
                      </td>
                      <td class="px-4 py-3 text-xs text-default">
                        Path to the local SQLite database file.
                      </td>
                    </tr>
                    <tr class="bg-default transition-colors hover:bg-elevated/30">
                      <td class="px-4 py-3 font-mono text-xs text-highlighted">
                        DEVIN_PROXY_POLLING_INTERVAL_MS
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-muted">
                        10000
                      </td>
                      <td class="px-4 py-3 text-xs text-default">
                        How often (ms) the proxy polls Devin for session updates.
                      </td>
                    </tr>
                    <tr class="bg-default transition-colors hover:bg-elevated/30">
                      <td class="px-4 py-3 font-mono text-xs text-highlighted">
                        DEVIN_PROXY_COOLDOWN_MS
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-muted">
                        900000
                      </td>
                      <td class="px-4 py-3 text-xs text-default">
                        Cooldown (ms) applied to a key after it hits a rate limit. Default: 15 min.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </UPageCard>
          </section>

          <!-- ── Proxy API ──────────────────────────────────────────────── -->
          <section id="docs-proxy">
            <div class="mb-5 flex items-center gap-3">
              <h2 class="text-lg font-bold text-highlighted">
                Proxy API
              </h2>
              <span class="rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-default">
                OpenAI-compatible
              </span>
            </div>

            <p class="mb-5 text-sm text-muted">
              The proxy endpoint mirrors the OpenAI chat completions API. Point any OpenAI-compatible SDK at
              <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">http://localhost:3000</code> and it works without code changes.
            </p>

            <!-- POST /v1/chat/completions -->
            <div
              class="overflow-hidden rounded-xl border border-default"
              :class="methodBorder['POST']"
              style="border-left-width: 4px"
            >
              <button
                class="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
                :class="methodHeaderBg['POST']"
                @click="toggle('post-completions')"
              >
                <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['POST']">POST</span>
                <code class="flex-1 font-mono text-sm font-medium text-highlighted">/v1/chat/completions</code>
                <span class="hidden text-xs text-muted sm:block">Create chat completion</span>
                <UIcon
                  :name="openEndpoints['post-completions'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="ml-auto size-4 shrink-0 text-muted"
                />
              </button>

              <div v-if="openEndpoints['post-completions']" class="border-t border-default">
                <div class="space-y-6 p-6">
                  <p class="text-sm text-default">
                    Accepts an OpenAI chat completions payload. The proxy compiles the message array into a structured Devin prompt,
                    creates a session, and polls until completion. Supports both blocking and Server-Sent Events (SSE) streaming responses.
                  </p>

                  <!-- Auth note -->
                  <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs dark:border-amber-800/50 dark:bg-amber-950/20">
                    <UIcon name="i-lucide-info" class="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p class="text-amber-700 dark:text-amber-400">
                      No <code class="font-mono">Authorization</code> header is required. The proxy uses the Devin API keys stored in its local database.
                    </p>
                  </div>

                  <!-- Request body -->
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      Request body
                    </p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Field</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Type</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Required</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Description</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-default">
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">model</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-elevated px-2 py-0.5 text-muted ring-1 ring-default">No</span></td>
                            <td class="px-4 py-2.5 text-default">Model identifier. Any string is accepted; defaults to <code class="font-mono text-highlighted">devin-proxy-hub</code>.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">messages</td>
                            <td class="px-4 py-2.5 font-mono text-muted">array</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">Yes</span></td>
                            <td class="px-4 py-2.5 text-default">Array of message objects. At least one required. Each message has <code class="font-mono text-highlighted">role</code> and <code class="font-mono text-highlighted">content</code>.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">stream</td>
                            <td class="px-4 py-2.5 font-mono text-muted">boolean</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-elevated px-2 py-0.5 text-muted ring-1 ring-default">No</span></td>
                            <td class="px-4 py-2.5 text-default">Enable SSE streaming. Defaults to <code class="font-mono text-highlighted">true</code>.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">temperature</td>
                            <td class="px-4 py-2.5 font-mono text-muted">number</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-elevated px-2 py-0.5 text-muted ring-1 ring-default">No</span></td>
                            <td class="px-4 py-2.5 text-default">Accepted but not forwarded to Devin. Included for SDK compatibility.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">user</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-elevated px-2 py-0.5 text-muted ring-1 ring-default">No</span></td>
                            <td class="px-4 py-2.5 text-default">Accepted but not forwarded. Included for SDK compatibility.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- Message roles -->
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      Supported message roles
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <span v-for="role in ['system', 'user', 'assistant', 'tool', 'developer']" :key="role"
                        class="rounded-full bg-elevated px-3 py-1 font-mono text-xs text-default ring-1 ring-default">
                        {{ role }}
                      </span>
                    </div>
                  </div>

                  <!-- Examples: request / non-stream response / stream response -->
                  <div class="space-y-4">
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        Example request
                      </p>
                      <div class="relative">
                        <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.completionRequestBody }}</code></pre>
                        <button
                          class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                          @click="copyText('completion-req', CODE.completionRequestBody)"
                        >
                          <UIcon :name="copiedId === 'completion-req' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        Response — stream: false
                      </p>
                      <div class="relative">
                        <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.completionResponse }}</code></pre>
                        <button
                          class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                          @click="copyText('completion-resp', CODE.completionResponse)"
                        >
                          <UIcon :name="copiedId === 'completion-resp' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        Response — stream: true (SSE)
                      </p>
                      <div class="relative">
                        <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.streamResponse }}</code></pre>
                        <button
                          class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
                          @click="copyText('stream-resp', CODE.streamResponse)"
                        >
                          <UIcon :name="copiedId === 'stream-resp' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Finish reasons -->
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                      Finish reasons
                    </p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Value</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">When</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-default">
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">stop</td>
                            <td class="px-4 py-2.5 text-default">Devin session completed successfully.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">length</td>
                            <td class="px-4 py-2.5 text-default">Session stopped, errored, or was aborted before natural completion.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── API Keys ───────────────────────────────────────────────── -->
          <section id="docs-keys">
            <div class="mb-5 flex items-center gap-3">
              <h2 class="text-lg font-bold text-highlighted">
                API Keys
              </h2>
              <span class="rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-default">
                Dashboard API
              </span>
            </div>

            <p class="mb-5 text-sm text-muted">
              Manage the pool of Devin API keys the proxy rotates through. All mutations flush to SQLite immediately.
            </p>

            <div class="space-y-3">
              <!-- GET /api/keys -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['GET']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['GET']"
                  @click="toggle('get-keys')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['GET']">GET</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/keys</code>
                  <span class="hidden text-xs text-muted sm:block">List all API keys</span>
                  <UIcon :name="openEndpoints['get-keys'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['get-keys']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Returns all stored Devin API keys ordered by <code class="font-mono text-xs text-highlighted">orderIndex</code>.
                    Raw key values are never returned — only masked representations.
                  </p>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response — 200 OK</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.keyListResponse }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('keys-list-resp', CODE.keyListResponse)">
                        <UIcon :name="copiedId === 'keys-list-resp' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- POST /api/keys -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['POST']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['POST']"
                  @click="toggle('post-keys')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['POST']">POST</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/keys</code>
                  <span class="hidden text-xs text-muted sm:block">Add a new API key</span>
                  <UIcon :name="openEndpoints['post-keys'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['post-keys']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Stores a new Devin API key. The key is appended at the end of the rotation order and immediately available.
                  </p>
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Request body</p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Field</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Type</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Required</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Description</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-default">
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">name</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">Yes</span></td>
                            <td class="px-4 py-2.5 text-default">Human-readable label for this key.</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">apiKey</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">Yes</span></td>
                            <td class="px-4 py-2.5 text-default">The raw Devin API key (stored, never returned).</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">orgId</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">Yes</span></td>
                            <td class="px-4 py-2.5 text-default">Devin organization ID (e.g. <code class="font-mono text-highlighted">org_xxxxxxxxxx</code>).</td>
                          </tr>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">status</td>
                            <td class="px-4 py-2.5 font-mono text-muted">string</td>
                            <td class="px-4 py-2.5"><span class="rounded-full bg-elevated px-2 py-0.5 text-muted ring-1 ring-default">No</span></td>
                            <td class="px-4 py-2.5 text-default">Initial status. Defaults to <code class="font-mono text-highlighted">active</code>. Enum: <code class="font-mono text-highlighted">active</code> | <code class="font-mono text-highlighted">rate_limited</code> | <code class="font-mono text-highlighted">invalid</code> | <code class="font-mono text-highlighted">disabled</code> | <code class="font-mono text-highlighted">exhausted</code>.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Example request</p>
                      <div class="relative">
                        <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.createKeyBody }}</code></pre>
                        <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('create-key-req', CODE.createKeyBody)">
                          <UIcon :name="copiedId === 'create-key-req' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response — 200 OK</p>
                      <div class="relative">
                        <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.keyResponse }}</code></pre>
                        <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('create-key-resp', CODE.keyResponse)">
                          <UIcon :name="copiedId === 'create-key-resp' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- PATCH /api/keys/:id -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['PATCH']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['PATCH']"
                  @click="toggle('patch-keys')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['PATCH']">PATCH</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/keys/:id</code>
                  <span class="hidden text-xs text-muted sm:block">Update a key</span>
                  <UIcon :name="openEndpoints['patch-keys'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['patch-keys']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Partially updates a key's name, raw secret, org ID, or status.
                    Setting status to <code class="font-mono text-xs text-highlighted">active</code> also clears the cooldown and last error.
                    Omit <code class="font-mono text-xs text-highlighted">apiKey</code> to keep the stored secret unchanged.
                  </p>
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Path parameter</p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Parameter</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Type</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">id</td>
                            <td class="px-4 py-2.5 font-mono text-muted">integer</td>
                            <td class="px-4 py-2.5 text-default">The numeric ID of the key to update.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Example body (all fields optional)</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.patchKeyBody }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('patch-key', CODE.patchKeyBody)">
                        <UIcon :name="copiedId === 'patch-key' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 text-xs text-muted">
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">Returns updated <code class="font-mono text-highlighted">ApiKeyListItem</code></span>
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">404 if key not found</span>
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">400 on validation error</span>
                  </div>
                </div>
              </div>

              <!-- DELETE /api/keys/:id -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['DELETE']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['DELETE']"
                  @click="toggle('delete-keys')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['DELETE']">DELETE</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/keys/:id</code>
                  <span class="hidden text-xs text-muted sm:block">Remove a key</span>
                  <UIcon :name="openEndpoints['delete-keys'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['delete-keys']" class="border-t border-default p-6 space-y-4">
                  <p class="text-sm text-default">
                    Permanently removes the key and re-indexes <code class="font-mono text-xs text-highlighted">orderIndex</code> for all remaining keys to keep them contiguous.
                  </p>
                  <div class="flex flex-wrap gap-2 text-xs text-muted">
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">Returns <code class="font-mono text-highlighted">{ "ok": true }</code></span>
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">404 if not found</span>
                  </div>
                </div>
              </div>

              <!-- POST /api/keys/reorder -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['POST']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['POST']"
                  @click="toggle('post-reorder')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['POST']">POST</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/keys/reorder</code>
                  <span class="hidden text-xs text-muted sm:block">Reorder keys</span>
                  <UIcon :name="openEndpoints['post-reorder'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['post-reorder']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Sets the rotation priority order by accepting the full ordered list of key IDs.
                    The proxy will rotate through keys in this order, skipping any that are rate-limited, invalid, or disabled.
                  </p>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Request body</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.reorderBody }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('reorder', CODE.reorderBody)">
                        <UIcon :name="copiedId === 'reorder' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p class="text-xs text-muted">
                    Returns the updated <code class="font-mono text-highlighted">ApiKeyListItem[]</code> in the new order.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Sessions ───────────────────────────────────────────────── -->
          <section id="docs-sessions">
            <div class="mb-5 flex items-center gap-3">
              <h2 class="text-lg font-bold text-highlighted">
                Sessions
              </h2>
              <span class="rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-default">
                Dashboard API
              </span>
            </div>

            <p class="mb-5 text-sm text-muted">
              Every chat completion request creates a proxy session. Sessions record the original prompt, Devin session ID,
              status, all events received from Devin, and the raw final payload.
            </p>

            <div class="space-y-3">
              <!-- GET /api/sessions -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['GET']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['GET']"
                  @click="toggle('get-sessions')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['GET']">GET</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/sessions</code>
                  <span class="hidden text-xs text-muted sm:block">List sessions</span>
                  <UIcon :name="openEndpoints['get-sessions'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['get-sessions']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Returns recent proxy sessions ordered by <code class="font-mono text-xs text-highlighted">startedAt</code> descending.
                  </p>
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Query parameters</p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Parameter</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Type</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Default</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr class="bg-default">
                            <td class="px-4 py-2.5 font-mono font-medium text-highlighted">limit</td>
                            <td class="px-4 py-2.5 font-mono text-muted">integer</td>
                            <td class="px-4 py-2.5 font-mono text-muted">50</td>
                            <td class="px-4 py-2.5 text-default">Maximum number of sessions to return.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response — 200 OK</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.sessionListResponse }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('sessions-list', CODE.sessionListResponse)">
                        <UIcon :name="copiedId === 'sessions-list' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <!-- Status values -->
                  <div>
                    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Session status values</p>
                    <div class="overflow-x-auto rounded-xl border border-default">
                      <table class="w-full text-xs">
                        <thead>
                          <tr class="border-b border-default bg-elevated/40">
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Value</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-muted">Meaning</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-default">
                          <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">queued</td><td class="px-4 py-2.5 text-default">Session created, waiting for a Devin key.</td></tr>
                          <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">running</td><td class="px-4 py-2.5 text-default">Devin session is active and being polled.</td></tr>
                          <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">finished</td><td class="px-4 py-2.5 text-default">Devin completed successfully.</td></tr>
                          <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">stopped</td><td class="px-4 py-2.5 text-default">Session was stopped or aborted.</td></tr>
                          <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">error</td><td class="px-4 py-2.5 text-default">Proxy or Devin encountered a fatal error.</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <!-- GET /api/sessions/:id -->
              <div
                class="overflow-hidden rounded-xl border border-default"
                :class="methodBorder['GET']"
                style="border-left-width: 4px"
              >
                <button
                  class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                  :class="methodHeaderBg['GET']"
                  @click="toggle('get-session-detail')"
                >
                  <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['GET']">GET</span>
                  <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/sessions/:id</code>
                  <span class="hidden text-xs text-muted sm:block">Session detail</span>
                  <UIcon :name="openEndpoints['get-session-detail'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
                </button>
                <div v-if="openEndpoints['get-session-detail']" class="border-t border-default p-6 space-y-5">
                  <p class="text-sm text-default">
                    Returns the full session record including the compiled prompt, raw latest Devin payload, and the complete
                    ordered list of session events.
                  </p>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response — 200 OK</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.sessionDetailResponse }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('session-detail', CODE.sessionDetailResponse)">
                        <UIcon :name="copiedId === 'session-detail' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 text-xs text-muted">
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">404 if not found</span>
                    <span class="rounded bg-elevated px-2 py-1 ring-1 ring-default">400 on invalid id</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Overview ───────────────────────────────────────────────── -->
          <section id="docs-overview">
            <div class="mb-5 flex items-center gap-3">
              <h2 class="text-lg font-bold text-highlighted">
                Overview
              </h2>
              <span class="rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-default">
                Dashboard API
              </span>
            </div>

            <div
              class="overflow-hidden rounded-xl border border-default"
              :class="methodBorder['GET']"
              style="border-left-width: 4px"
            >
              <button
                class="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
                :class="methodHeaderBg['GET']"
                @click="toggle('get-overview')"
              >
                <span class="shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold" :class="methodBadge['GET']">GET</span>
                <code class="flex-1 font-mono text-sm font-medium text-highlighted">/api/overview</code>
                <span class="hidden text-xs text-muted sm:block">Dashboard overview</span>
                <UIcon :name="openEndpoints['get-overview'] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="ml-auto size-4 shrink-0 text-muted" />
              </button>
              <div v-if="openEndpoints['get-overview']" class="border-t border-default p-6 space-y-5">
                <p class="text-sm text-default">
                  Returns aggregate stats, all API keys, and the 12 most recent sessions in a single request.
                  Used by the Overview dashboard page which polls every 10 seconds.
                </p>
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Response — 200 OK</p>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.overviewResponse }}</code></pre>
                    <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('overview-resp', CODE.overviewResponse)">
                      <UIcon :name="copiedId === 'overview-resp' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Stats fields</p>
                  <div class="overflow-x-auto rounded-xl border border-default">
                    <table class="w-full text-xs">
                      <thead>
                        <tr class="border-b border-default bg-elevated/40">
                          <th class="px-4 py-2.5 text-left font-semibold text-muted">Field</th>
                          <th class="px-4 py-2.5 text-left font-semibold text-muted">Description</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">activeSessions</td><td class="px-4 py-2.5 text-default">Count of sessions currently in <code class="font-mono text-highlighted">queued</code> or <code class="font-mono text-highlighted">running</code> state.</td></tr>
                        <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">totalSessions</td><td class="px-4 py-2.5 text-default">Total sessions ever created.</td></tr>
                        <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">availableKeys</td><td class="px-4 py-2.5 text-default">Keys with <code class="font-mono text-highlighted">active</code> status (or cooldown expired).</td></tr>
                        <tr class="bg-default"><td class="px-4 py-2.5 font-mono font-medium text-highlighted">rateLimitedKeys</td><td class="px-4 py-2.5 text-default">Keys currently in cooldown.</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Integrations ───────────────────────────────────────────── -->
          <section id="docs-integrations">
            <h2 class="mb-5 text-lg font-bold text-highlighted">
              Integrations
            </h2>
            <p class="mb-6 text-sm text-muted">
              Because the proxy is fully OpenAI-compatible, it works with any client that supports a custom base URL.
            </p>

            <!-- Tab bar -->
            <div class="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-default bg-elevated/30 p-1">
              <button
                v-for="tab in ([
                  { id: 'opencode', label: 'OpenCode', icon: 'i-simple-icons-openai' },
                  { id: 'python', label: 'Python', icon: 'i-simple-icons-python' },
                  { id: 'nodejs', label: 'Node.js', icon: 'i-simple-icons-nodedotjs' },
                  { id: 'curl', label: 'cURL', icon: 'i-lucide-terminal' }
                ] as const)"
                :key="tab.id"
                class="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="integrationTab === tab.id
                  ? 'bg-default text-highlighted shadow-sm ring-1 ring-default'
                  : 'text-muted hover:text-default'"
                @click="integrationTab = tab.id"
              >
                <UIcon :name="tab.icon" class="size-3.5" />
                {{ tab.label }}
              </button>
            </div>

            <!-- OpenCode -->
            <div v-if="integrationTab === 'opencode'" class="space-y-5">
              <UPageCard variant="subtle">
                <div class="space-y-4">
                  <div class="flex items-start gap-3">
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <UIcon name="i-lucide-book-open" class="size-4 text-primary" />
                    </div>
                    <div>
                      <p class="font-semibold text-highlighted">
                        OpenCode integration
                      </p>
                      <p class="mt-1 text-sm text-muted">
                        <a href="https://opencode.ai" target="_blank" class="text-primary underline-offset-2 hover:underline">OpenCode</a>
                        is an AI coding assistant that uses any OpenAI-compatible model. Point it at the proxy to use Devin as the backend.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Step 1 — Start the proxy</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>pnpm dev  # or: PORT=3000 node .output/server/index.mjs</code></pre>
                    </div>
                  </div>

                  <div>
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Step 2 — Add Devin API key in the dashboard</p>
                    <p class="mb-3 text-xs text-muted">
                      Open <code class="rounded bg-elevated px-1 font-mono text-highlighted">http://localhost:3000/keys</code>
                      and add your Devin API key and org ID.
                    </p>
                  </div>

                  <div>
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Step 3 — Configure OpenCode</p>
                    <p class="mb-3 text-xs text-muted">
                      Add or update <code class="rounded bg-elevated px-1 font-mono text-highlighted">opencode.json</code> in your project root
                      (or <code class="rounded bg-elevated px-1 font-mono text-highlighted">~/.config/opencode/config.json</code> for global config):
                    </p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.openCodeConfig }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('opencode-cfg', CODE.openCodeConfig)">
                        <UIcon :name="copiedId === 'opencode-cfg' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Step 4 — Run OpenCode</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>opencode</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('opencode-run', 'opencode')">
                        <UIcon :name="copiedId === 'opencode-run' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                    <p class="mt-3 text-xs text-muted">
                      OpenCode will pick up the config, use <code class="font-mono text-highlighted">devin-proxy-hub</code> as the model,
                      and route every request through Devin Proxy Hub. Watch the
                      <NuxtLink to="/sessions" class="text-primary underline-offset-2 hover:underline">Sessions</NuxtLink>
                      page to see each Devin session appear in real time.
                    </p>
                  </div>
                </div>
              </UPageCard>
            </div>

            <!-- Python -->
            <div v-else-if="integrationTab === 'python'" class="space-y-5">
              <UPageCard variant="subtle">
                <div class="space-y-4">
                  <p class="text-sm text-muted">
                    Install the official OpenAI Python client, then set <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">base_url</code> to your proxy.
                    The <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">api_key</code> value is ignored by the proxy but must be non-empty to satisfy the client.
                  </p>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>pip install openai</code></pre>
                  </div>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.pythonCode }}</code></pre>
                    <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('python-code', CODE.pythonCode)">
                      <UIcon :name="copiedId === 'python-code' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                    </button>
                  </div>
                </div>
              </UPageCard>
            </div>

            <!-- Node.js -->
            <div v-else-if="integrationTab === 'nodejs'" class="space-y-5">
              <UPageCard variant="subtle">
                <div class="space-y-4">
                  <p class="text-sm text-muted">
                    Install the official OpenAI Node.js SDK, then point <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">baseURL</code> at the proxy.
                  </p>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-sm text-neutral-100 dark:bg-neutral-950"><code>npm install openai</code></pre>
                  </div>
                  <div class="relative">
                    <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.nodejsCode }}</code></pre>
                    <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('nodejs-code', CODE.nodejsCode)">
                      <UIcon :name="copiedId === 'nodejs-code' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                    </button>
                  </div>
                </div>
              </UPageCard>
            </div>

            <!-- cURL -->
            <div v-else-if="integrationTab === 'curl'" class="space-y-5">
              <UPageCard variant="subtle">
                <div class="space-y-4">
                  <p class="text-sm text-muted">
                    No dependencies needed — just cURL. Add <code class="rounded bg-elevated px-1.5 font-mono text-xs text-highlighted">-N</code> to enable streaming.
                  </p>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Blocking (stream: false)</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>{{ CODE.curlIntegration }}</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('curl-integration', CODE.curlIntegration)">
                        <UIcon :name="copiedId === 'curl-integration' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Streaming (stream: true)</p>
                    <div class="relative">
                      <pre class="overflow-x-auto rounded-xl bg-neutral-900 px-5 py-4 font-mono text-xs text-neutral-100 leading-relaxed dark:bg-neutral-950"><code>curl -N http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"devin-proxy-hub","stream":true,"messages":[{"role":"user","content":"Fix the failing test"}]}'</code></pre>
                      <button class="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100" @click="copyText('curl-stream', `curl -N http://localhost:3000/v1/chat/completions -H &quot;Content-Type: application/json&quot; -d '{&quot;model&quot;:&quot;devin-proxy-hub&quot;,&quot;stream&quot;:true,&quot;messages&quot;:[{&quot;role&quot;:&quot;user&quot;,&quot;content&quot;:&quot;Fix the failing test&quot;}]}'`)">
                        <UIcon :name="copiedId === 'curl-stream' ? 'i-lucide-check' : 'i-lucide-copy'" class="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </UPageCard>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
