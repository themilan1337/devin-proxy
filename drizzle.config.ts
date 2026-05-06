import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './server/utils/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: './sqlite.db'
  },
  strict: true,
  verbose: true
})
