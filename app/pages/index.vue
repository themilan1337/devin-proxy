<script setup lang="ts">
useSeoMeta({
  title: "Devin Proxy Hub",
  description: "A small Nuxt dashboard and OpenAI-compatible proxy for routing chat completion requests into Devin sessions.",
  ogTitle: "Devin Proxy Hub",
  ogDescription: "Run Devin behind an OpenAI-compatible chat completions endpoint with local keys, sessions, and history.",
})

const features = [
  {
    label: "Endpoint",
    title: "OpenAI-compatible route",
    text: "Accepts POST /v1/chat/completions, prepares a Devin prompt, and returns chat completion responses.",
  },
  {
    label: "Keys",
    title: "Local key rotation",
    text: "Store multiple Devin API keys, disable weak keys, and fail over when a credential cools down.",
  },
  {
    label: "History",
    title: "Session inspection",
    text: "Review prompts, events, raw payloads, and proxy status from a small admin dashboard.",
  },
  {
    label: "Storage",
    title: "SQLite by default",
    text: "Keep request history and settings in a local database file that is easy to back up or move.",
  },
]

const steps = [
  "Client sends an OpenAI-style chat completion request.",
  "Proxy converts messages into a single Devin session prompt.",
  "Dashboard stores session state, events, keys, and raw payloads.",
]

const commands = ["pnpm install", "cp .env.example .env", "pnpm dev"]
</script>

<template>
  <main class="min-h-[100dvh] overflow-hidden bg-[#fbfbfa] text-[#111111]">
    <div class="pointer-events-none fixed inset-0 opacity-[0.035]">
      <div class="absolute left-[-10%] top-[-20%] h-[32rem] w-[32rem] rounded-full bg-[#d9cdbb] blur-3xl" />
      <div class="absolute bottom-[-24%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-[#b6c9bc] blur-3xl" />
    </div>

    <header class="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <a href="#" class="text-sm font-semibold tracking-[-0.02em]">
        Devin Proxy Hub
      </a>
      <nav class="hidden items-center gap-7 text-sm text-[#6f6d68] md:flex">
        <a class="transition-colors hover:text-[#111111]" href="#features">Features</a>
        <a class="transition-colors hover:text-[#111111]" href="#flow">Flow</a>
        <a class="transition-colors hover:text-[#111111]" href="#start">Start</a>
      </nav>
      <a
        href="#start"
        class="border border-[#111111] bg-[#111111] px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2f2f] active:scale-[0.98]"
      >
        Run locally
      </a>
    </header>

    <section class="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 pb-20 pt-14 sm:px-8 md:grid-cols-[1.12fr_0.88fr] md:pb-28 md:pt-24">
      <div class="max-w-3xl">
        <p class="mb-6 inline-flex border border-[#e8e6e1] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#806132]">
          Local Nuxt proxy
        </p>
        <h1 class="text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-[#111111] sm:text-6xl md:text-7xl">
          Make Devin speak chat completions.
        </h1>
        <p class="mt-7 max-w-[58ch] text-base leading-8 text-[#6f6d68] sm:text-lg">
          Devin Proxy Hub sits between your OpenAI-compatible client and the Devin API. It creates sessions, polls status, rotates keys, and keeps a readable local trail.
        </p>
        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href="#start"
            class="inline-flex justify-center border border-[#111111] bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#2f2f2f] active:scale-[0.98]"
          >
            Start in three commands
          </a>
          <a
            href="#features"
            class="inline-flex justify-center border border-[#e8e6e1] bg-white px-5 py-3 text-sm font-semibold text-[#111111] transition duration-200 hover:border-[#d7d4cc] active:scale-[0.98]"
          >
            See what it does
          </a>
        </div>
      </div>

      <div class="md:pt-10">
        <div class="border border-[#e8e6e1] bg-white shadow-[0_24px_70px_-48px_rgba(17,17,17,0.45)]">
          <div class="flex items-center gap-2 border-b border-[#eeeeea] px-5 py-4">
            <span class="h-2.5 w-2.5 rounded-full bg-[#d8d5cc]" />
            <span class="h-2.5 w-2.5 rounded-full bg-[#d8d5cc]" />
            <span class="h-2.5 w-2.5 rounded-full bg-[#d8d5cc]" />
            <span class="ml-auto font-mono text-xs text-[#8b8983]">/v1/chat/completions</span>
          </div>
          <div class="space-y-5 p-5 sm:p-7">
            <div class="grid grid-cols-[auto_1fr] gap-4 border-b border-[#eeeeea] pb-5">
              <span class="font-mono text-xs text-[#8b8983]">01</span>
              <div>
                <p class="text-sm font-semibold">Request accepted</p>
                <p class="mt-1 text-sm leading-6 text-[#6f6d68]">model: devin-proxy-hub, stream: false</p>
              </div>
            </div>
            <div class="grid grid-cols-[auto_1fr] gap-4 border-b border-[#eeeeea] pb-5">
              <span class="font-mono text-xs text-[#8b8983]">02</span>
              <div>
                <p class="text-sm font-semibold">Session created</p>
                <p class="mt-1 text-sm leading-6 text-[#6f6d68]">Prompt assembled from chat messages</p>
              </div>
            </div>
            <div class="grid grid-cols-[auto_1fr] gap-4">
              <span class="font-mono text-xs text-[#8b8983]">03</span>
              <div>
                <p class="text-sm font-semibold">Response normalized</p>
                <p class="mt-1 text-sm leading-6 text-[#6f6d68]">Events become an OpenAI-style completion</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="features" class="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
      <div class="grid grid-cols-1 gap-10 md:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.14em] text-[#8b8983]">What it covers</p>
          <h2 class="mt-4 max-w-md text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            The glue code, with a clean control room.
          </h2>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="border border-[#e8e6e1] bg-white p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-24px_rgba(17,17,17,0.55)]"
          >
            <p class="font-mono text-xs uppercase tracking-[0.14em] text-[#806132]">{{ feature.label }}</p>
            <h3 class="mt-5 text-xl font-semibold tracking-[-0.025em]">{{ feature.title }}</h3>
            <p class="mt-3 text-sm leading-7 text-[#6f6d68]">{{ feature.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="flow" class="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
      <div class="grid grid-cols-1 gap-8 border-y border-[#e8e6e1] py-10 md:grid-cols-[1fr_1.4fr] md:py-14">
        <div>
          <p class="font-mono text-xs uppercase tracking-[0.14em] text-[#8b8983]">Request flow</p>
          <h2 class="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
            One local path from client to Devin.
          </h2>
        </div>
        <ol class="space-y-0">
          <li
            v-for="(step, index) in steps"
            :key="step"
            class="grid grid-cols-[3rem_1fr] gap-4 border-b border-[#eeeeea] py-5 last:border-b-0"
          >
            <span class="font-mono text-xs text-[#8b8983]">0{{ index + 1 }}</span>
            <p class="text-base leading-7 text-[#383733]">{{ step }}</p>
          </li>
        </ol>
      </div>
    </section>

    <section id="start" class="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-[1.25fr_0.75fr]">
        <div class="border border-[#e8e6e1] bg-[#111111] p-6 text-white sm:p-8">
          <p class="font-mono text-xs uppercase tracking-[0.14em] text-[#b9b6ad]">Quick start</p>
          <div class="mt-6 space-y-3">
            <div
              v-for="(command, index) in commands"
              :key="command"
              class="grid grid-cols-[2.5rem_1fr] items-center gap-3 border border-white/10 bg-white/[0.035] px-4 py-3"
            >
              <span class="font-mono text-xs text-[#b9b6ad]">0{{ index + 1 }}</span>
              <code class="font-mono text-sm text-[#f4f1e9]">{{ command }}</code>
            </div>
          </div>
        </div>
        <div class="border border-[#e8e6e1] bg-white p-6 sm:p-8">
          <p class="font-mono text-xs uppercase tracking-[0.14em] text-[#8b8983]">After launch</p>
          <h2 class="mt-5 text-2xl font-semibold tracking-[-0.035em]">Add a Devin key, then point your client at the local endpoint.</h2>
          <p class="mt-5 text-sm leading-7 text-[#6f6d68]">
            The app runs as a standard Nuxt/Nitro server and stores local state in SQLite.
          </p>
        </div>
      </div>
    </section>

    <footer class="relative mx-auto flex max-w-7xl flex-col gap-3 border-t border-[#e8e6e1] px-5 py-8 text-sm text-[#6f6d68] sm:px-8 md:flex-row md:items-center md:justify-between">
      <p>Devin Proxy Hub</p>
      <p>OpenAI-compatible at the chat completions entry point.</p>
    </footer>
  </main>
</template>
