# IncidentHub

A lightweight incident management application: REST API + web UI for raising, tracking, filtering, assigning, and resolving operational incidents.

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

| Variable         | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string - pre-filled for local Docker   |
| `GEMINI_API_KEY` | Google AI API key - **required**                           |
| `GEMINI_MODEL`   | Gemini model name (default: `gemini-2.5-flash`)            |
| `PORT`           | API listen port (default: `3001`)                          |
| `NODE_ENV`       | `development` or `production`                              |
| `CORS_ORIGIN`    | Allowed frontend origin (default: `http://localhost:5173`) |

### `/web/.env` (production only - copy from `/web/.env.example`)

| Variable            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `VITE_API_BASE_URL` | Deployed API base URL (not needed for local dev) |

---

## Seeded Data

### Groups (teams)

Incidents can only be raised against target groups, and only the members can self assign

| Name               | Description                             |
| ------------------ | --------------------------------------- |
| DBA                | Database administration team            |
| Ops / Prod Support | Production operations and support       |
| Platform           | Platform and infrastructure engineering |
| Security           | Security incident response              |

### Users

| Name         | Teams                        |
| ------------ | ---------------------------- |
| Alice Chen   | DBA                          |
| Bob Patel    | DBA, Platform                |
| Carol Smith  | Ops / Prod Support           |
| Dan Okafor   | Ops / Prod Support           |
| Eva Müller   | Platform                     |
| Frank Torres | Security                     |
| Grace Kim    | Security, Ops / Prod Support |

To act as a user, select them from the user-switcher dropdown in the navbar. The dropdown lists each user's team(s) beneath their name (not their email) so you can see at a glance who belongs where before switching. The selected user is sent as `X-User-Id` on every request - this is the auth seam (see below).

### Incidents

The seed includes incidents across all severities and statuses - Critical/InProgress, High/Open, Medium/Open, and Closed examples, so the board looks alive immediately.

---

## Exercising Features

### Core incident flow

1. **Create an incident** — click "New Incident" → fill title + description → click "Suggest with AI" to get an AI-recommended severity and team (prefills the fields with an "AI-suggested" badge, stays fully editable) → submit.
2. **View the list** — filter by severity, status, or team; search by title/description; sort newest-first (default); real empty state when filters match nothing.
3. **Open an incident** → view detail. Generate an **AI summary** or **root-cause suggestions** from the detail page (each is on-demand via its own button, never auto-fired, and persists so reloading shows the cached value with a "Regenerate" option).
4. **Self-assign** — switch to a user who is a member of the incident's target group → "Self-assign" button is enabled on the Assignment card.
5. **Update status** — the stepped tracker on the detail page shows `Open → InProgress → Resolved → Closed` (plus `Resolved → InProgress` to reopen). Only the current assignee or a target-group member can advance it; moving into `InProgress` additionally requires the incident to already have an assignee (the button is disabled with an inline hint until you self-assign — no silent auto-assignment). Status updates apply optimistically in the UI and roll back automatically if the request fails.
6. **Edit fields** — reporter or any target-group member can edit title, description, severity.
7. **Comment** — the reporter, current assignee, or any target-group member can post comments on an incident (add-only, oldest-first, no edit/delete by design). Everyone else sees a read-only thread and a hint explaining who can post.

### Natural-language intake

1. On the "New Incident" page, use the "Describe it in plain English" panel at the top of the form.
2. Type a free-form incident description (e.g. "nightly DB refresh failed in prod, customers can't see balances") — the "Parse with AI" button enables once you've typed at least 20 characters.
3. AI parses the text into structured fields (title, description, severity, target group) using Gemini function-calling and prefills the form below with an "AI-suggested" badge.
4. Review the pre-filled fields — nothing is created yet. Click "Create Incident" to confirm and submit.

### Switching users (RBAC demo)

- Select **Carol Smith** (Ops) → self-assign an Ops incident: allowed.
- Select **Alice Chen** (DBA) → try to self-assign the same Ops incident: blocked with 403.
- Deselect the acting user (or switch to someone with no relationship to the incident) → the comment box and status-update controls disappear, replaced with a hint explaining who's allowed.
- The permission model is fully visible in the API responses — no silent failures.

---

## API Surface

All AI endpoints proxy through the API - the Gemini key is never sent to the browser.

| Method  | Path                        | Description                                                                 |
| ------- | --------------------------- | --------------------------------------------------------------------------- |
| `GET`   | `/health`                   | Uptime check                                                                |
| `POST`  | `/incidents`                | Create incident                                                             |
| `GET`   | `/incidents`                | List + filter (`severity`, `status`, `group`, `q`, `page`, `limit`, `sort`) |
| `GET`   | `/incidents/:id`            | Detail                                                                      |
| `PATCH` | `/incidents/:id/status`     | Transition status (state-machine validated)                                 |
| `PATCH` | `/incidents/:id/assignee`   | Assign (membership-gated)                                                   |
| `PATCH` | `/incidents/:id`            | Edit fields (reporter or target-group member)                               |
| `POST`  | `/incidents/suggest`        | AI: severity + group suggestion from description                            |
| `POST`  | `/incidents/:id/summary`    | AI: incident summary (cached on incident row)                               |
| `POST`  | `/incidents/:id/root-cause` | AI: root-cause hypotheses (cached on incident row)                          |
| `POST`  | `/incidents/intake`         | AI: natural-language → structured incident (function-calling)               |
| `GET`   | `/incidents/:id/comments`   | List comments on an incident, oldest-first                                  |
| `POST`  | `/incidents/:id/comments`   | Add a comment (reporter, assignee, or target-group member only)             |
| `GET`   | `/users`                    | List users with their group memberships embedded (navbar switcher)          |
| `GET`   | `/groups`                   | List groups (for create form + filters)                                     |
| `GET`   | `/users/:id/groups`         | Memberships for a single user                                               |

**Error shape (all endpoints):**

```json
{
  "error": {
    "code": "ILLEGAL_TRANSITION",
    "message": "Cannot move from Closed to Open",
    "details": {}
  }
}
```

---

## Auth Seam

There is no authentication in this build (deliberately out of scope - see below). Identity is supplied via the `X-User-Id` header, set by the navbar user-switcher.

The `resolveCurrentUser` middleware reads this header, resolves the user from the DB, and attaches `req.currentUser`. Everything downstream - services, RBAC checks, receives `currentUser` as a parameter and never touches `req` directly.

**Dropping in real auth later requires changing only this middleware:**

```ts
// Today
const user = await userRepo.findById(req.headers["x-user-id"]);

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
- Using NEON Postgres Database URL in production
- Add `GEMINI_API_KEY`, `CORS_ORIGIN` (your Vercel URL) as Railway environment variables.
- After first deploy, run migrations: `railway run npm run db:migrate && railway run npm run db:seed`.

---

## Deliberately Out of Scope

These are deliberate boundaries, not gaps. Each is "easily supported by the existing architecture":

- **Authentication / login / JWT / sessions** — the `X-User-Id` header stands in; the auth seam means JWT drops in at one point.
- **Group join/leave UI** — memberships are seeded. (Note: leaving a team would not cascade-unassign — also explicitly out of scope.)
- **Status history / audit trail** — `updatedAt` covers "something changed"; a full event log is a separate write model.
- **Comment edit/delete** — comments are add-only by design (see Exercising Features above); no ownership/soft-delete model was built.
- **Attachments, SLA timers, escalation policies** — not ITSM.
- **Microservices / service decomposition** — modular monolith is the deliberate choice; the README notes when splitting is justified.
- **Voice input.**
- **Soft delete** — incidents are hard-deleted if removed (no delete UI exists in v1).
