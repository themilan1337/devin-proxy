import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/sql-js'
import initSqlJs from 'sql.js'

import { schema } from './schema'

let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null

function getDatabasePath() {
  const runtimeConfig = useRuntimeConfig()
  return resolve(process.cwd(), runtimeConfig.devinProxy.sqlitePath)
}

async function getSqlJsModule() {
  sqlJsPromise ||= initSqlJs({
    locateFile: file => resolve(process.cwd(), 'node_modules/sql.js/dist', file)
  })
  return sqlJsPromise
}

async function createSqliteClient() {
  const SQL = await getSqlJsModule()
  const databasePath = getDatabasePath()
  const initialData = existsSync(databasePath)
    ? new Uint8Array(await readFile(databasePath))
    : undefined

  return initialData ? new SQL.Database(initialData) : new SQL.Database()
}

type SqliteClient = Awaited<ReturnType<typeof createSqliteClient>>

function createDrizzleDatabase(client: SqliteClient) {
  return drizzle(client, { schema })
}

type DrizzleDatabase = ReturnType<typeof createDrizzleDatabase>

let sqliteClient: SqliteClient | null = null
let database: DrizzleDatabase | null = null
let initializationPromise: Promise<void> | null = null

async function persistDatabase(client: SqliteClient) {
  const databasePath = getDatabasePath()
  await mkdir(dirname(databasePath), { recursive: true }).catch(() => undefined)
  await writeFile(databasePath, Buffer.from(client.export()))
}

async function ensureSchema(client: SqliteClient) {
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        org_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        cooldown_until TEXT,
        last_error TEXT,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS api_keys_status_idx ON api_keys(status)',
      'CREATE INDEX IF NOT EXISTS api_keys_order_idx ON api_keys(order_index)',
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        devin_session_id TEXT,
        devin_url TEXT,
        client_ip TEXT,
        prompt_snippet TEXT NOT NULL,
        original_prompt TEXT NOT NULL,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        last_error TEXT,
        raw_latest_payload TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        last_polled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS sessions_status_idx ON sessions(status)',
      'CREATE INDEX IF NOT EXISTS sessions_devin_session_idx ON sessions(devin_session_id)',
      `CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL,
        external_id TEXT,
        event_type TEXT NOT NULL,
        summary TEXT,
        payload TEXT,
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS session_events_session_idx ON session_events(session_id, sequence)'
    ]

    for (const statement of statements) {
      client.run(statement)
    }

    await persistDatabase(client)
  })()

  return initializationPromise
}

export async function getSqliteClient() {
  if (!sqliteClient) {
    sqliteClient = await createSqliteClient()
  }

  return sqliteClient
}

export async function getDb() {
  if (!database) {
    database = createDrizzleDatabase(await getSqliteClient())
  }

  await ensureSchema(await getSqliteClient())
  return database
}

export async function flushDbToDisk() {
  if (!sqliteClient) {
    return
  }

  await persistDatabase(sqliteClient)
}
