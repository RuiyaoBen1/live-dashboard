# Live Dashboard

Real-time personal activity dashboard — monitor what your devices are doing right now.

## Architecture

```
[Agents] --HTTP POST /api/report--> [Backend (Bun)] --serves--> [Frontend (Next.js static)]
                                        |
                                    SQLite
```

## Features

- **Device Status** — real-time online/offline status, foreground app, battery
- **Activity Timeline** — scrollable history grouped by date
- **Music Player** — floating player with album covers and playlist support
- **App Statistics** — pie/bar charts showing app usage breakdown (7/30 days)
- **Panel Summary** — auto-generated daily activity summary per device group
- **Weather Cards** — location-based weather display
- **Message Board** — visitor messages
- **Health Data** — heart rate, steps, sleep tracking
- **Night Mode** — auto dark theme when all devices offline

## Tech Stack

| Package | Tech |
|---------|------|
| `packages/backend` | Bun + TypeScript + SQLite |
| `packages/frontend` | Next.js 15 + React 19 + Tailwind CSS 4 + Recharts |
| `packages/windows-agent` | C# .NET 10 WinForms |
| `packages/android-agent` | Kotlin Android |

## Quick Start

```bash
# Backend
cd packages/backend
bun install
export STATIC_DIR=../frontend/out
bun run src/index.ts          # or: bun --watch src/index.ts

# Frontend (dev)
cd packages/frontend
bun install
bun run dev                   # next dev --turbopack

# Frontend (production build)
bun run build                 # next build -> out/
```

## Environment Variables

Set in `packages/backend/.env`:

| Variable | Format |
|----------|--------|
| `DEVICE_TOKEN_N` | `token:device_id:device_name:platform:panel_id` |
| `HASH_SECRET` | HMAC secret for title hashing |
| `ADMIN_TOKEN` / `ADMIN_PASSWORD` | Admin panel auth |
| `DISPLAY_NAME` | User display name |
| `SITE_TITLE` / `SITE_DESC` / `SITE_FAVICON` | Site customization |
| `STATIC_DIR` | Path to frontend static files |
| `WEATHER_LOCATIONS` | JSON array of weather card configs |
| `PANELS` | JSON array of device group definitions |
| `MUSIC_PLAYLIST` | JSON array of `{title, artist, url, cover}` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/current` | Current device states |
| GET | `/api/timeline` | Activity timeline |
| GET | `/api/config` | Site configuration |
| GET | `/api/stats` | App usage statistics |
| GET | `/api/panel-summary` | Panel daily summary |
| GET | `/api/health` / `/api/health-data` | Health records |
| GET/POST/DELETE | `/api/messages` | Message board |
| POST | `/api/report` | Agent activity reporting |

