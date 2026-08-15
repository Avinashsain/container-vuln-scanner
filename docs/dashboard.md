# Web Dashboard

A Grafana/SonarQube-style vulnerability-management web app built **around** the
existing Trivy/Bash/Python scanner — nothing in `scripts/`, `ci/`,
`.github/workflows/`, or the Prometheus/Grafana stack was changed. The
dashboard is a separate, additive consumer: it shells out to the same `trivy`
binary, reads the same `configs/scanner-config.env` and `.trivyignore`, and
writes raw scan JSON into the same `reports/` directory.

- **Backend**: `server/` — Node.js + TypeScript + Express + Prisma + PostgreSQL + Socket.IO
- **Frontend**: `web/` — React + TypeScript + Vite + Tailwind CSS + Recharts + TanStack Query
- **Database**: dedicated `postgres` container (separate from `sonarqube_db`)
- **Deployment**: two new Dockerfiles (`server/Dockerfile`, `web/Dockerfile`) plus additive services in the root `docker-compose.yml`

## Contents

- [Project structure](#project-structure)
- [All changed/added files](#all-changedadded-files)
- [Database migrations](#database-migrations)
- [Environment variables](#environment-variables)
- [Docker Compose changes](#docker-compose-changes)
- [Starting the complete system](#starting-the-complete-system)
- [Creating the first admin user](#creating-the-first-admin-user)
- [API documentation](#api-documentation)
- [Testing instructions](#testing-instructions)

---

## Project Structure

```
container-vuln-scanner/
├── server/                          # NEW — Node/TS/Express/Prisma backend
│   ├── src/
│   │   ├── index.ts                     # entrypoint: http.Server + Socket.IO + scheduler
│   │   ├── app.ts                       # Express app, route wiring, CORS/cookies
│   │   ├── config/env.ts                # typed env access (DATABASE_URL, JWT_SECRET, REPO_ROOT, ...)
│   │   ├── lib/
│   │   │   ├── prisma.ts                    # Prisma client singleton
│   │   │   ├── jwt.ts, password.ts          # auth primitives (jsonwebtoken, bcryptjs)
│   │   │   ├── asyncHandler.ts              # Express async route wrapper
│   │   │   ├── imageRef.ts                  # parse/format/normalize "repo/name:tag" refs
│   │   │   ├── trivyParser.ts               # shared Trivy JSON → DB row mapping
│   │   │   ├── scannerConfig.ts             # reads configs/scanner-config.env (IGNORE_UNFIXED)
│   │   │   ├── csv.ts                       # CSV escaping/serialization
│   │   │   └── severity.ts                  # CRITICAL>HIGH>MEDIUM>LOW>UNKNOWN rank
│   │   ├── middleware/
│   │   │   ├── auth.ts                      # requireAuth / requireRole(...)
│   │   │   └── errorHandler.ts              # HttpError + centralized error responses
│   │   ├── routes/
│   │   │   ├── auth.routes.ts               # login/logout/me
│   │   │   ├── users.routes.ts              # admin user management
│   │   │   ├── dashboard.routes.ts          # summary/severity/trends/images
│   │   │   ├── images.routes.ts             # list/add/detail/history/scan/schedule
│   │   │   ├── scans.routes.ts              # list/detail/cancel/delete
│   │   │   ├── vulnerabilities.routes.ts    # cross-image filtered/sorted list
│   │   │   └── reports.routes.ts            # list/view/download (JSON/HTML/CSV/PDF)
│   │   ├── services/
│   │   │   ├── scanner.service.ts           # spawns trivy, persists results, emits socket events
│   │   │   ├── scheduler.service.ts         # 60s tick — triggers due auto-scans
│   │   │   └── report.service.ts            # on-demand report generation (pdfkit for PDF)
│   │   └── sockets/
│   │       ├── index.ts                     # Socket.IO server + cookie-JWT auth middleware
│   │       ├── io.ts                        # module-level io singleton
│   │       └── events.ts                    # typed emit helpers
│   ├── scripts/import-reports.ts        # one-time backfill from existing reports/*.json
│   ├── prisma/
│   │   ├── schema.prisma                    # User, Image, Scan, Vulnerability, Report
│   │   ├── seed.ts                          # creates first ADMIN from ADMIN_EMAIL/ADMIN_PASSWORD
│   │   └── migrations/                      # 2 migrations — see below
│   ├── Dockerfile                       # installs trivy binary, builds + runs the API
│   ├── .env.example
│   └── package.json
│
├── web/                              # NEW — React/TS/Vite frontend
│   ├── src/
│   │   ├── main.tsx, App.tsx            # provider tree + routes
│   │   ├── api/client.ts                    # axios instance (baseURL "/api", withCredentials)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx, ThemeContext.tsx, ToastContext.tsx
│   │   │   └── SocketContext.tsx            # socket.io-client connection + live query invalidation
│   │   ├── hooks/useScanActions.ts          # add/trigger/cancel/delete/schedule mutations
│   │   ├── lib/                             # format.ts, severity.ts, severityColors.ts
│   │   ├── types/index.ts                   # shared TS types mirroring API shapes
│   │   ├── components/
│   │   │   ├── layout/                      # Sidebar, Topbar, AppLayout, ProtectedRoute
│   │   │   ├── ui/                          # Card, StatCard, SeverityBadge, StatusBadge,
│   │   │   │                                # SeverityCounts, SearchInput, EmptyState, Spinner,
│   │   │   │                                # ConfirmDialog
│   │   │   ├── charts/                      # SeverityDonutChart, SeverityTrendChart,
│   │   │   │                                # TopVulnerableImagesChart
│   │   │   ├── VulnerabilityTable.tsx, RecentScansTable.tsx, AddImageModal.tsx
│   │   └── pages/
│   │       ├── Login.tsx, Dashboard.tsx, Settings.tsx
│   │       ├── Images.tsx, ImageDetail.tsx
│   │       ├── Vulnerabilities.tsx
│   │       ├── Scans.tsx, ScanDetail.tsx
│   │       ├── Reports.tsx, ReportDetail.tsx
│   │       └── Users.tsx
│   ├── nginx.conf                       # serves the SPA, proxies /api and /socket.io to server:4000
│   ├── Dockerfile
│   └── vite.config.ts                   # dev proxy → localhost:4000 for /api and /socket.io
│
├── scripts/, configs/, ci/, .github/, dashboards/, reports/   # UNCHANGED
├── docker-compose.yml                # UPDATED — see below
└── .gitignore                        # UPDATED — node_modules/, server/.env, dist/, reports/generated/
```

## All Changed/Added Files

**Modified (existing files):**
- `docker-compose.yml` — added `postgres`, `server`, `web` services + `trivy_cache`/`vulnscanner_postgres_data` volumes
- `.gitignore` — added `node_modules/`, `server/.env`, `server/dist/`, `web/dist/`, `web/.env`, `reports/generated/`

**Added — everything under `server/` and `web/`** (see tree above). Nothing under `scripts/`, `configs/`, `ci/`, `.github/`, `dashboards/`, or the original `Dockerfile`/`setup.sh` was touched.

## Database Migrations

Two migrations, applied in order:

| Migration | What it does |
|---|---|
| `20260812182332_init` | Creates `User`, `Image`, `Scan`, `Vulnerability`, `Report` tables and the `Role`/`ScanStatus`/`Severity`/`ReportFormat` enums |
| `20260813180939_add_scan_scheduling` | Adds `Image.scanIntervalMinutes` and `Image.lastAutoScanAt` for automatic recurring scans |

**Applying them:**

```bash
cd server
npm install                 # first time only
npx prisma migrate deploy   # applies any pending migrations (safe to re-run)
```

For local development against `localhost:5433` (see `DATABASE_URL` below), you can also use:
```bash
npx prisma migrate dev      # applies migrations and regenerates the Prisma client
```

If you ever change `server/prisma/schema.prisma` yourself, generate a new migration with:
```bash
npx prisma migrate dev --name <describe_the_change>
```

## Environment Variables

`server/.env` (copy from `server/.env.example`, gitignored):

| Variable | Purpose | Local dev default | docker-compose value |
|---|---|---|---|
| `NODE_ENV` | `development` / `production` | `development` | `production` (set in Dockerfile) |
| `PORT` | API port | `4000` | `4000` |
| `DATABASE_URL` | Postgres connection string | `postgresql://vulnscanner:vulnscanner@localhost:5433/vulnscanner` | `postgresql://vulnscanner:vulnscanner@postgres:5432/vulnscanner` (overridden in compose) |
| `JWT_SECRET` | Signs session cookies — generate with `openssl rand -hex 32` | *(required, no default)* | same |
| `JWT_EXPIRES_IN` | Session length | `8h` | `8h` |
| `COOKIE_SECURE` | `Secure` flag on the cookie | `false` | `false` (set `true` behind HTTPS) |
| `CORS_ORIGIN` | Allowed origin for cross-origin requests | `http://localhost:5173` (Vite dev server) | not needed — nginx proxies same-origin |
| `REPO_ROOT` | cwd for spawning `trivy` (so `.trivyignore` is picked up) + base for `configs/scanner-config.env` | `..` (repo root, relative to `server/`) | `/app` (overridden in compose) |
| `REPORTS_DIR` | Where raw scan JSON is written/read | `../reports` | `/app/reports` (overridden in compose) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used **only** by `npm run seed` to create the first admin | — | — |

The frontend (`web/`) needs **no** env vars — it always calls relative `/api` and `/socket.io` paths, proxied by Vite in dev and by nginx in the container.

## Docker Compose Changes

Additive only — `prometheus`, `pushgateway`, `grafana`, `sonarqube`, `sonarqube_db` are untouched and keep running on their existing ports.

| Service | Image/Build | Port | Notes |
|---|---|---|---|
| `postgres` | `postgres:15` | `5433:5432` | Dedicated to the dashboard app — separate from `sonarqube_db` |
| `server` | `./server` | `4000:4000` | Mounts `./reports`, `./configs`, `.trivyignore`, and `/var/run/docker.sock` (so Trivy can scan locally-built images); named volume `trivy_cache` persists the ~500MB vulnerability DB across restarts |
| `web` | `./web` | `8181:80` | nginx serving the built SPA, reverse-proxying `/api` and `/socket.io` to `server:4000` |

> Port `8181` (not `8080`) is used for `web` to avoid clashing with a locally running Jenkins on `8080`.

## Starting the Complete System

**Full stack via Docker Compose (recommended):**

```bash
cd container-vuln-scanner

# 1. Create the server's .env (one-time)
cp server/.env.example server/.env
# edit server/.env: set JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL, ADMIN_PASSWORD

# 2. Build and start everything (existing scanner stack + new dashboard)
docker compose up -d --build

# 3. Apply database migrations + seed the first admin (one-time, or after a schema change)
docker compose exec server npx prisma migrate deploy
docker compose exec server npm run seed

# 4. (Optional) backfill dashboard history from your existing reports/*.json files
docker compose exec server npm run import:reports
```

Open **http://localhost:8181** and sign in with the admin credentials from step 1.

**Local development (hot reload, no Docker for the app itself — Postgres still via Docker):**

```bash
docker compose up -d postgres   # just the database

cd server
cp .env.example .env            # DATABASE_URL should point at localhost:5433
npm install
npx prisma migrate dev
npm run seed
npm run dev                     # http://localhost:4000

# in a second terminal
cd web
npm install
npm run dev                     # http://localhost:5173 (proxies /api + /socket.io to :4000)
```

## Creating the First Admin User

The seed script (`server/prisma/seed.ts`) creates exactly one admin from environment variables, and is idempotent (skips if that email already exists):

```bash
# Docker:
docker compose exec server npm run seed

# Local dev (from server/):
npm run seed
```

It reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `server/.env` — set them before running. To create additional users afterward (of either role), sign in as that admin and use the **Users** page (`/users`), or `POST /api/users` directly (see below).

## API Documentation

All endpoints are under `/api`. Except `/auth/login`, every route requires the `token` httpOnly cookie set at login; routes marked **ADMIN** additionally require that role.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` → sets session cookie |
| POST | `/api/auth/logout` | ✓ | Clears the session cookie |
| GET | `/api/auth/me` | ✓ | Current user `{ id, email, role }` |
| GET | `/api/users` | ADMIN | List all users |
| POST | `/api/users` | ADMIN | Create user `{ email, password, role }` |
| PATCH | `/api/users/:id` | ADMIN | Update `{ role?, password? }` |
| DELETE | `/api/users/:id` | ADMIN | Delete a user (not yourself) |
| GET | `/api/dashboard/summary` | ✓ | The 10 summary-card metrics |
| GET | `/api/dashboard/severity` | ✓ | `{ CRITICAL, HIGH, MEDIUM, LOW }` for the donut chart |
| GET | `/api/dashboard/trends` | ✓ | `?range=7d\|30d\|90d` or `?start=&end=`, optional `?imageId=` |
| GET | `/api/dashboard/images` | ✓ | Top vulnerable images, `?limit=` |
| GET | `/api/images` | ✓ | All images + each one's latest scan |
| POST | `/api/images` | ADMIN | `{ imageRef }` — upserts the image and starts a scan |
| GET | `/api/images/:id` | ✓ | Image detail + latest scan |
| GET | `/api/images/:id/history` | ✓ | Every scan for this image, oldest→newest |
| PATCH | `/api/images/:id` | ADMIN | `{ scanIntervalMinutes }` — auto-scan schedule (`null`/`0` = off) |
| POST | `/api/images/:id/scan` | ADMIN | Trigger a rescan (409 if one is already running) |
| GET | `/api/scans` | ✓ | `?status=&imageId=&search=&limit=&offset=` |
| GET | `/api/scans/:id` | ✓ | Scan detail + full vulnerability list |
| POST | `/api/scans/:id/cancel` | ADMIN | Kill a running scan |
| DELETE | `/api/scans/:id` | ADMIN | Delete a scan (cascades vulnerabilities + reports) |
| GET | `/api/vulnerabilities` | ✓ | `?severity=&imageId=&search=&limit=&offset=` — latest completed scan per image |
| GET | `/api/vulnerabilities/:id` | ✓ | Single vulnerability + its scan/image |
| GET | `/api/reports` | ✓ | `?imageId=&search=&limit=&offset=` — one row per completed scan |
| GET | `/api/reports/:id` | ✓ | Scan + vulnerabilities, for the "View Report" page (`:id` is the scan id) |
| GET | `/api/reports/:id/download?format=` | ✓ | `format=JSON\|HTML\|CSV\|PDF` — generates (if not cached) and streams the file |

**Socket.IO** (same origin, cookie-authenticated on handshake): every client joins a `dashboard` room automatically; emit `scan:subscribe`/`scan:unsubscribe` with a scan id to join/leave `scan:<id>` for that scan's live progress. Events: `scan.started`, `scan.progress`, `scan.completed`, `scan.failed`, `scan.cancelled`, `vulnerability.found`.

## Testing Instructions

**Backend smoke test (curl):**
```bash
# Login
curl -i -c cookies.txt -X POST localhost:8181/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<your-password>"}'

# Confirm session + real (non-hardcoded) dashboard data
curl -b cookies.txt localhost:8181/api/auth/me
curl -b cookies.txt localhost:8181/api/dashboard/summary

# Trigger a real scan and poll until it completes
curl -b cookies.txt -X POST localhost:8181/api/images \
  -H 'Content-Type: application/json' -d '{"imageRef":"alpine:latest"}'
curl -b cookies.txt localhost:8181/api/scans/<scanId>   # watch status go RUNNING → COMPLETED

# Download each report format
curl -b cookies.txt "localhost:8181/api/reports/<scanId>/download?format=PDF" -o report.pdf
```

**RBAC check:** log in as a `VIEWER` user and confirm `POST /api/users`, `POST /api/images/:id/scan`, and `DELETE /api/scans/:id` all return `403`, while every `GET` still returns `200`.

**Real-time check:** open a Scan Detail page (`/scans/:id`) for a `RUNNING` scan in one tab, trigger a rescan of the same image from another tab/device — the progress bar and eventual "Completed" toast should appear in the first tab **without a page refresh**.

**Scheduler check:** `PATCH /api/images/:id` with `{"scanIntervalMinutes": 1}`, then wait ~90 seconds and confirm `GET /api/images/:id/history` grew by one entry (check server logs for `[scheduler] auto-scanning ...`). Set it back to `null` afterward.

**UI walkthrough:** log in → Dashboard (10 cards + 4 charts + recent scans, all real data) → Images (search/filter, "Scan New Image") → Image Detail (trend chart, scan history, vulnerability table, auto-scan dropdown) → Vulnerabilities (severity/image/text filters) → Scans (status/image/text filters, cancel/delete) → Reports (View + JSON/HTML/CSV/PDF download) → Users (admin-only) → Settings (theme toggle).

There is no automated test suite for `server/`/`web/` yet (this was built and verified via the manual/curl flows above plus live browser checks); if you want, a follow-up pass can add Vitest/Supertest coverage for the route handlers and a Playwright suite for the critical UI paths.
