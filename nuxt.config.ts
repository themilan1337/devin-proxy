// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxtjs/eslint-module',
    '@nuxtjs/fontaine',
    '@nuxtjs/google-fonts'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    },
    '/v1/**': {
      cors: true
    }
  },

  runtimeConfig: {
    devinProxy: {
      devinApiBase: process.env.DEVIN_API_BASE || 'https://api.devin.ai/v3',
      sqlitePath: process.env.DEVIN_PROXY_SQLITE_PATH || 'sqlite.db',
      pollingIntervalMs: Number(process.env.DEVIN_PROXY_POLLING_INTERVAL_MS || 10000),
      rateLimitCooldownMs: Number(process.env.DEVIN_PROXY_COOLDOWN_MS || 900000)
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
