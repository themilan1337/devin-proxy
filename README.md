# Devin Proxy Hub

[![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt.js&logoColor=white)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3-42B883?logo=vue.js&logoColor=white)](https://vuejs.org)
[![OpenAI Compatible](https://img.shields.io/badge/API-OpenAI%20Compatible-412991)](https://platform.openai.com/docs/api-reference/chat)
[![SQLite](https://img.shields.io/badge/Storage-SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/index.html)
[![License](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

Devin Proxy Hub is a local dashboard and proxy that makes Devin look like an OpenAI chat completion endpoint.

It sits in front of the Devin API, accepts `POST /v1/chat/completions`, creates a Devin session, polls it, and turns the results into OpenAI-style responses. On top of that, it gives you a small admin UI for API key rotation, request history, and session inspection.

## What it does

- Exposes an OpenAI-compatible `POST /v1/chat/completions` route
- Converts chat messages into a single Devin session prompt
- Polls Devin session state and stores request history locally
- Streams or returns OpenAI-style completion responses
- Supports multiple Devin API keys with transparent failover
- Keeps a local dashboard for keys, session logs, and raw payload inspection
- Persists everything to a local SQLite file

## Why this exists

If you want to point an OpenAI-compatible client at Devin, you usually end up writing glue code first. This project is that glue code, but with a usable UI and session history instead of a pile of scripts.

## Stack

- Nuxt 4 + Vue 3
- Nuxt UI + Tailwind CSS
- Drizzle schema definitions
- Local SQLite persistence via `sql.js`
- Node deployment target via Nitro's `node-server` preset

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create your env file

```bash
cp .env.example .env
```

### 3. Start the app

```bash
pnpm dev
```

Open `http://localhost:3000` and add at least one Devin API key in the **API Keys** page before sending requests through the proxy.

## Configuration

These values come from `.env`:

| Variable | Default | What it does |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | empty | Public site URL for generated metadata |
| `DEVIN_API_BASE` | `https://api.devin.ai/v3` | Base URL for the Devin API |
| `DEVIN_PROXY_SQLITE_PATH` | `sqlite.db` | Local SQLite file path |
| `DEVIN_PROXY_POLLING_INTERVAL_MS` | `10000` | Devin polling interval |
| `DEVIN_PROXY_COOLDOWN_MS` | `900000` | Cooldown for rate-limited keys |

## Using the proxy

Once you've added a valid Devin key and org ID in the dashboard, you can send requests to:

```text
POST /v1/chat/completions
```

Example:

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "devin-proxy-hub",
    "stream": false,
    "messages": [
      { "role": "user", "content": "Open the repo and explain the latest failure" }
    ]
  }'
```

The dashboard tracks the request, stores the generated prompt, and logs session events as Devin responds.

## Dashboard pages

- **Overview** — recent proxy activity and key health
- **API Keys** — add, edit, reorder, disable, or remove Devin credentials
- **Sessions** — inspect prompt text, session status, event logs, and raw payloads

## Development commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
pnpm db:generate
pnpm db:migrate
```

## Deployment

This app builds to a standard Nitro Node server, so deployment is straightforward.

### Build for production

```bash
pnpm install
pnpm build
```

### Run the production server

```bash
node .output/server/index.mjs
```

By default, Nitro reads `PORT` from the environment.

Example:

```bash
PORT=3000 node .output/server/index.mjs
```

### Recommended production setup

- Run it behind Caddy, Nginx, or another reverse proxy
- Keep `.env` and `sqlite.db` on persistent storage
- Back up `sqlite.db` if session history matters to you
- Use process supervision such as `systemd`, PM2, Fly Machines, or a container platform

### Minimal Linux deploy flow

```bash
git clone <your-repo>
cd dashboard
pnpm install
cp .env.example .env
# edit .env
pnpm build
PORT=3000 node .output/server/index.mjs
```

## Notes and limitations

- This project is **OpenAI-compatible at the chat completions entry point**, not a full OpenAI API clone.
- Key storage is masked in the UI, but credentials still live in a local database file on disk.
- If no valid Devin key is available, the proxy returns a controlled error and records the failed attempt in session history.
- Devin event shapes can vary. The proxy normalizes the common message, tool, and command patterns it can detect.

## Project structure

```text
app/                 Nuxt dashboard UI
server/api/          Dashboard backend endpoints
server/routes/v1/    OpenAI-compatible proxy route
server/utils/        DB, key rotation, session store, Devin bridge
shared/              Shared TypeScript types
```

## Roadmap ideas

- Better event-to-stream chunk mapping
- Secret encryption at rest
- Session retry controls from the dashboard
- Docker packaging
- Health and metrics endpoints

## License

MIT
