# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time personal activity dashboard. Agents report the current foreground app to a backend, which stores activity in SQLite and serves a static frontend showing live device status and activity timelines.

## Architecture

```
[Agents] --HTTP POST /api/report--> [Backend (Bun)] --serves--> [Frontend (Next.js static export)]
                                        |
                                    SQLite (/data/live-dashboard.db)
```

**Monorepo** (no workspace manager) with independent packages:

- `packages/backend/` — Bun/TypeScript HTTP server. Two ports: 3000 (public dashboard), 3001 (admin panel). Uses `Bun.serve()`, `bun:sqlite`. Entry: `src/index.ts`.
- `packages/frontend/` — Next.js 15 + React 19 + Tailwind CSS 4. Static export (`output: "export"`), no SSR at runtime. Two build variants via `NEXT_PUBLIC_ENABLE_ADMIN_PANEL` env var.
- `packages/windows-agent/` — C# .NET 10 WinForms agent.
- `packages/android-agent/` — Kotlin Android agent.

Backend serves the frontend's `out/` directory as static files. Site metadata (title, description, favicon) is injected at serve time via placeholder replacement in HTML.

## Build & Run

### One-click startup (primary)

Double-click `start-dev.bat` at project root. It will:
1. Start Cloudflare Tunnel (hidden window) for external access
2. Build the frontend (`bun run build`)
3. Start the backend with `bun --watch` (auto-restart on file changes)


### Hot-reload workflow

- **Backend changes** (routes, services, config): `bun --watch` auto-restarts on save — no manual steps needed
- **Frontend changes** (components, pages, CSS): run `bun run build` in `packages/frontend/`, backend picks up new static files immediately (no restart needed with watch mode)

## Environment Variables

Set via `.env` file in `packages/backend/`:

- `DEVICE_TOKEN_N` — Format: `token:device_id:device_name:platform:panel_id` (panel_id is optional 5th field)
- `HASH_SECRET` — HMAC secret for agent token hashing
- `ADMIN_TOKEN` / `ADMIN_PASSWORD` — Admin panel auth
- `DISPLAY_NAME` — User display name (default: xuyihong)
- `SITE_TITLE`, `SITE_DESC`, `SITE_FAVICON` — Site customization
- `STATIC_DIR` — Path to frontend static files for local dev (set to `packages/frontend/out` after build)
- `WEATHER_LOCATIONS` — JSON array `[{"panel_id":"zhr","city":"Haikou","label":"海口"}]` for weather cards
- `EXTERNAL_DASHBOARDS` — JSON array of dashboard profiles
- `PANELS` — JSON array `[{"id":"zhr","name":"zhr的面板"},{"id":"friend","name":"ljx的面板"}]` for device grouping
- `MUSIC_PLAYLIST` — JSON array `[{"title":"...","artist":"...","url":"/songs/...","cover":"/covers/..."}]` for music player

## Key Patterns

- **Backend has no build step** — Bun runs TypeScript directly.
- **Frontend is fully static** — `next build` with `output: "export"` produces files in `out/`. Backend serves from `STATIC_DIR` (defaults to `packages/frontend/out`).
- **Auth**: Agents use `Bearer <token>` header. Admin endpoints use `ADMIN_TOKEN` or `ADMIN_PASSWORD`.
- **Device tokens** are parsed from `DEVICE_TOKEN_1` through `DEVICE_TOKEN_N` env vars. The 5th field (`panel_id`) maps a device to a UI panel group.
- **Panels** group devices in the frontend. `getPanels()` reads `PANELS` env, `getDevicePanelId()` maps device to panel.
- **Site config injection**: `injectSiteConfig()` in `site-config.ts` replaces placeholders in HTML with runtime config values (different escaping for HTML vs JS contexts).
- **Device type detection**: Frontend uses `device_id` prefix to determine device type — `"pad"` → tablet, `"phone"` → phone, else → PC. Used in CurrentStatus for offline messages.
- **SQLite migrations** run inline on startup in `db.ts` (ALTER TABLE IF NOT EXISTS).
- **Album covers** are stored in `packages/frontend/public/covers/` (Next.js copies to `out/covers/` on build). New songs need cover art from iTunes API (`/search?term=ARTIST+ALBUM&entity=album`, use `artworkUrl100` → `1000x1000bb`).
- **MusicPlayer** in `MusicPlayer.tsx` renders album covers with spinning animation on play, supports proxy for external audio URLs.
- **App name beautify** — `DISPLAY_NAMES` mapping in `stats.ts` and `panel-summary.ts` converts technical names (idle, r5apex_dx12, VALORANT-Win64-Shipping) to display names (空闲, Apex英雄, VALORANT). Add new mappings here when unclear app names appear.
- **StatsOverlay** in `StatsOverlay.tsx` — Recharts pie/bar charts, panel selector, 7/30 day toggle, opened from right-sidebar 📊 button.
- **Panel summary** — `Header.tsx` shows auto-generated text from `/api/panel-summary`, refreshes every 30s.

## Frontend Structure

- `app/page.tsx` — Main dashboard page, handles polling, panel switching, dashboard tabs
- `src/lib/api.ts` — Typed fetch wrappers for all backend endpoints
- `src/components/` — DeviceCard, CurrentStatus, Timeline, HealthData, Header, WeatherCard, MessageBoard, MusicPlayer, StatsOverlay
- `src/hooks/` — useConfig, useDashboard

## Backend Structure

- `src/index.ts` — Entry point, `Bun.serve()` on ports 3000/3001
- `src/routes/` — Request handlers (current, config, timeline, health, report, proxy, messages, weather, stats, panel-summary)
- `src/middleware/` — auth.ts (token parsing, device configs), admin.ts
- `src/services/` — site-config.ts, app-mapper.ts, visitors.ts, cleanup.ts
- `src/db.ts` — SQLite schema, migrations, query helpers
