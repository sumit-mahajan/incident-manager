# IncidentHub

A lightweight incident management application: REST API + web UI for raising, tracking, filtering, assigning, and resolving operational incidents. Built as a focused slice of Opsgenie/PagerDuty — not full ITSM.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Postgres only)
- [Node.js 22+](https://nodejs.org/) (runs the API and web dev servers natively)
- A [Google AI](https://ai.google.dev/) API key (`GEMINI_API_KEY`)

---

## Local Run

The API and web app run natively on your machine for fast reloads. Docker Compose is used
only to provide Postgres.

```bash
# 1. Start Postgres
docker compose up -d db

# 2. Copy and fill in secrets
cp api/.env.example api/.env
# Edit api/.env — set GEMINI_API_KEY to your key

# 3. Install deps, run migrations, seed the database (first run only — seeding is
#    skipped automatically if data already exists)
cd api
npm install
npm run db:migrate
npm run db:seed

# 4. Start the API (in this terminal)
npm run dev
```

In a second terminal:

```bash
cd web
npm install
npm run dev
```

DB data persists across `docker compose down` / `up` via a named volume; to start over from a
truly empty database, run `docker compose down -v`.

- API: http://localhost:3001
- Frontend: http://localhost:5173
- Health check: http://localhost:3001/health

The Vite dev server proxies `/api/*` → `http://localhost:3001` so no CORS config is needed in
development.

---

## Environment Variables

### `/api/.env` (copy from `/api/.env.example`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string — pre-filled for local Docker |
| `GEMINI_API_KEY` | Google AI API key — **required** |
| `GEMINI_MODEL` | Gemini model name (default: `gemini-2.5-flash`) |
| `PORT` | API listen port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGIN` | Allowed frontend origin (default: `http://localhost:5173`) |

### `/web/.env` (production only — copy from `/web/.env.example`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Deployed API base URL (not needed for local dev) |

---

## Seeded Data

### Groups (teams)

| Name | Description |
|---|---|
| DBA | Database administration team |
| Ops / Prod Support | Production operations and support |
| Platform | Platform and infrastructure engineering |
| Security | Security incident response |

### Users

| Name | Teams |
|---|---|
| Alice Chen | DBA |
| Bob Patel | DBA, Platform |
| Carol Smith | Ops / Prod Support |
| Dan Okafor | Ops / Prod Support |
| Eva Müller | Platform |
| Frank Torres | Security |
| Grace Kim | Security, Ops / Prod Support |

To act as a user, select them from the user-switcher dropdown in the navbar. The selected user is sent as `X-User-Id` on every request — this is the auth seam (see below).

### Incidents

The seed includes incidents across all severities and statuses — Critical/InProgress, High/Open, Medium/Open, and Closed examples — so the board looks alive immediately.

---

## Exercising Features

### Core incident flow

1. **Create an incident** — click "New Incident" → fill title + description → click "Suggest" to get AI-recommended severity and team → confirm → submit.
2. **View the list** — filter by severity, status, or team; search by title/description; sort newest-first (default).
3. **Open an incident** → view detail. Generate an **AI summary** or **root-cause suggestions** from the detail page (each is on-demand, never auto-fired).
4. **Self-assign** — switch to a user who is a member of the incident's target group → "Assign to me" button is enabled.
5. **Update status** — assignee or any target-group member can advance the state: `Open → InProgress → Resolved → Closed`. Reopen from `Resolved → InProgress`. All other transitions are rejected with a clear error.
6. **Edit fields** — reporter or any target-group member can edit title, description, severity.

### Natural-language intake

1. Click "Natural Language Intake" in the nav.
2. Paste or type a free-form incident description (e.g. "nightly DB refresh failed in prod, customers can't see balances").
3. AI parses the text into structured fields using Gemini function-calling.
4. Review the pre-filled form — confirm or adjust before submitting.

### Switching users (RBAC demo)

- Select **Carol Smith** (Ops) → self-assign an Ops incident: allowed.
- Select **Alice Chen** (DBA) → try to self-assign the same Ops incident: blocked with 403.
- The permission model is fully visible in the API responses — no silent failures.

---

## API Surface

All AI endpoints proxy through the API — the Gemini key is never sent to the browser.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Uptime check |
| `POST` | `/incidents` | Create incident |
| `GET` | `/incidents` | List + filter (`severity`, `status`, `group`, `q`, `page`, `limit`, `sort`) |
| `GET` | `/incidents/:id` | Detail |
| `PATCH` | `/incidents/:id/status` | Transition status (state-machine validated) |
| `PATCH` | `/incidents/:id/assignee` | Assign (membership-gated) |
| `PATCH` | `/incidents/:id` | Edit fields (reporter or target-group member) |
| `POST` | `/incidents/suggest` | AI: severity + group suggestion from description |
| `POST` | `/incidents/:id/summary` | AI: incident summary (cached on incident row) |
| `POST` | `/incidents/:id/root-cause` | AI: root-cause hypotheses (cached on incident row) |
| `POST` | `/incidents/intake` | AI: natural-language → structured incident (function-calling) |
| `GET` | `/users` | List users (for navbar switcher) |
| `GET` | `/groups` | List groups (for create form + filters) |
| `GET` | `/users/:id/groups` | Memberships for a user |

**Error shape (all endpoints):**
```json
{ "error": { "code": "ILLEGAL_TRANSITION", "message": "Cannot move from Closed to Open", "details": {} } }
```

---

## Auth Seam

There is no authentication in this build (deliberately out of scope — see below). Identity is supplied via the `X-User-Id` header, set by the navbar user-switcher.

The `resolveCurrentUser` middleware reads this header, resolves the user from the DB, and attaches `req.currentUser`. Everything downstream — services, RBAC checks — receives `currentUser` as a parameter and never touches `req` directly.

**Dropping in real auth later requires changing only this middleware:**
```ts
// Today
const user = await userRepo.findById(req.headers['x-user-id']);

// With JWT
const user = await userRepo.findById(verifyJwt(req.headers.authorization).sub);
```

The `CurrentUser` shape and everything downstream is untouched.

---

## Deployment

### Frontend → Vercel

- Root directory: `/web`
- Build command: `npm run build`
- Output directory: `dist`
- Add `VITE_API_BASE_URL=https://your-railway-app.up.railway.app` in Vercel environment variables.
- `/web/vercel.json` handles SPA client-side routing rewrites.

### API + Postgres → Railway

- Root directory: `/api`
- Railway reads `/api/railway.toml` — builds via Dockerfile, health-checks `/health`.
- Add a PostgreSQL plugin in Railway (provides `DATABASE_URL` automatically).
- Add `GEMINI_API_KEY`, `CORS_ORIGIN` (your Vercel URL) as Railway environment variables.
- After first deploy, run migrations: `railway run npm run db:migrate && railway run npm run db:seed`.

---

## Production & Scaling Considerations

These are deliberately not built but the architecture supports them:

- **Read replicas + connection pooling** — `IncidentRepository` is behind an interface; swap the Drizzle `db` client for a pooled read-replica connection with no service-layer changes.
- **List query caching** — the list endpoint is a pure query; a Redis/Upstash cache layer (or HTTP caching with ETags) can be added transparently behind the repository interface.
- **Async AI queue** — today AI calls are synchronous and user-initiated. Under load, replace with a job queue (BullMQ/Upstash QStash): enqueue from the route, poll/subscribe for results. The `LlmClient` interface absorbs this without touching services.
- **Horizontal API scaling** — stateless Express; add replicas behind a load balancer. Only gap to resolve first: the `incident_key_seq` Postgres sequence is already collision-safe under concurrent creates; no app-level locking needed.
- **Structured logging + tracing** — `pino` emits structured JSON per request. Feeding into Datadog/Grafana/Loki and adding OpenTelemetry trace IDs is an additive change (add middleware, no business logic changes).
- **Optimistic concurrency on edits** — current last-write-wins. Add a `version` column + `If-Match` header check in the repository layer when concurrent edit conflicts become a real problem.

---

## Deliberately Out of Scope

These are deliberate boundaries, not gaps. Each is "easily supported by the existing architecture":

- **Authentication / login / JWT / sessions** — the `X-User-Id` header stands in; the auth seam means JWT drops in at one point.
- **Group join/leave UI** — memberships are seeded. (Note: leaving a team would not cascade-unassign — also explicitly out of scope.)
- **Status history / audit trail** — `updatedAt` covers "something changed"; a full event log is a separate write model.
- **Comments, attachments, SLA timers, escalation policies** — not ITSM.
- **Microservices / service decomposition** — modular monolith is the deliberate choice; the README notes when splitting is justified.
- **Voice input.**
- **Soft delete** — incidents are hard-deleted if removed (no delete UI exists in v1).
