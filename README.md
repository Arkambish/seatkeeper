# Seatkeeper

Seatkeeper is a full-stack workshop registration app for a community training centre. Front-desk staff use it to register attendees for workshops that have a limited number of seats. It is built with Next.js (App Router) and PostgreSQL, using Prisma and TanStack Query.

The core rule: **a workshop can never hold more active registrations than its capacity, even when several people book the last seat at the same moment.**

See [DESIGN.md](DESIGN.md) for design decisions, trade-offs and how over-registration is prevented.

---

## Quick start

**Prerequisites:**
- Node.js 20.9 or newer
- One PostgreSQL database: a cloud one, a local install, or Docker

```bash
# 1. Install dependencies (this also generates the Prisma client)
npm install

# 2. Configure the environment
cp .env.example .env
#    then edit DATABASE_URL / DIRECT_URL (see "Database options" below)

# 3. Create the tables and load the sample data
npm run db:setup

# 4. Run the app
npm run dev        # http://localhost:3000
```

### Sign-in accounts (development only)

| Role | Email | Password |
|---|---|---|
| **Admin** (the seeded first account) | `admin@example.com` | `Admin123!` |
| Manager (demo) | `manager@example.com` | `Manager123!` |
| Staff (demo) | `staff@example.com` | `Staff123!` |

In development, the login page also has one-click buttons for these accounts. The brief only requires the Admin. The Manager and Staff accounts are seeded so you can try every role straight away. Otherwise, sign in as Admin and create them under **Accounts**.

The seed adds:
- 3 locations.
- 8 workshops spread across this week and next. One is full and has a waitlist, one has its last seat free, one is cancelled and one is already completed.
- Active and cancelled registrations, so the history is populated.

You can re-run the seed safely: `npm run db:seed`.

### Database options

- **Cloud Postgres (Neon, Supabase, …):**
  - Set `DATABASE_URL` to the pooled URL. Neon's pooler works as is with Prisma 6. Older PgBouncer setups may need `&pgbouncer=true`.
  - Set `DIRECT_URL` to the direct URL, which migrations use.
  - For tests, set `DATABASE_URL_TEST` to the same database with `&schema=test`.
- **Docker:** `docker compose up -d` starts Postgres 17 on port 5433, with an app database and a test database. The defaults in `.env.example` already point at it.
- **Local Postgres:**
  - `createdb workshop_registration && createdb workshop_registration_test`.
  - Point the three URLs at them.

When you deploy, run the app in the same region as the database. For example, a Neon database in `ap-southeast-1` pairs with Vercel region `sin1`. Each query is then about 1 ms instead of a round trip across continents.

Set `NEXT_PUBLIC_APP_TIMEZONE` to the centre's timezone, for example `Europe/London`. It controls how times are shown and what "this week" means. Changing it requires a rebuild.

---

## Deploy to Vercel

The repo is ready to import as-is. `vercel.json` pins functions to `sin1` (Singapore), next to the Neon database.

1. Push to GitHub, then **Add New Project** in Vercel and import the repo. The framework is detected automatically.
2. Under **Settings → Environment Variables**, add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL (`…-pooler…`) |
   | `DIRECT_URL` | Neon **direct** URL (no `-pooler`), used for migrations |
   | `NEXT_PUBLIC_APP_URL` | The deployment URL, e.g. `https://seatkeeper.vercel.app` |
   | `NEXT_PUBLIC_APP_TIMEZONE` | The centre's timezone, e.g. `Asia/Colombo` |
   | `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | `true` to show the demo-login buttons for reviewers (optional) |

3. Deploy. The build (`npm run vercel-build`):
   - generates the Prisma client
   - runs `prisma migrate deploy` on **production** deploys only, so preview deploys never touch the schema
   - builds Next.js
4. Seed once, from your machine, with the production URLs in `.env`: `npm run db:seed`.

Node is pinned to 24.x through `engines` in `package.json`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build && npm start` | Production build and server |
| `npm run vercel-build` | What Vercel runs: generate, migrate (production only), build |
| `npm run db:setup` | Apply migrations and seed |
| `npm run db:migrate` / `npm run db:seed` | Each step on its own |
| `npm test` | Concurrency and access-control tests against `DATABASE_URL_TEST` |
| `npm run hammer` | Live demo against a running server: 50 simultaneous HTTP registrations for 10 seats. Exactly 10 succeed. |
| `npm run lint` / `npm run typecheck` | Static checks |

---

## What's in the box

**Access control** (enforced by the API; the UI only hides what the API would refuse anyway)

| | Admin | Manager | Staff |
|---|:-:|:-:|:-:|
| Create accounts and set roles | ✓ | | |
| Add and edit workshops | | ✓ | |
| Register and cancel attendees | | ✓ | ✓ |
| View workshops, registrations and history | | ✓ | ✓ |

**Features:**
- **Workshops:** code, title, instructor, location, start/end, capacity and status, plus description and who created or last edited it.
- **Registrations:**
  - An attendee is a name and an email, with no account.
  - Cancelling never deletes anything. Each row keeps who registered it and when, who cancelled it, when and why, and when it was promoted from the waitlist.
- **Finding workshops:**
  - Date presets: Upcoming, This week, Next 7 days, All dates, or a custom range.
  - Filters: status, location, "has free seats" and text search.
  - The filters live in the URL, so a view can be shared or bookmarked.
- **Public website (no sign-in):**
  - `/` is a landing page with upcoming workshops by category, live seat availability, how booking works and the studios.
  - `/classes/[id]` shows each workshop's details and a "Call to book" panel.
  - It's read-only by design: bookings still go through the front desk, as the brief describes, so the capacity rule has one door.
  - It never shows attendee names or emails.
  - Pages are cached on the server and refreshed in the background after every staff booking or edit.
  - Public pages are indexable, with schema.org Event data, a sitemap and robots rules. The staff app stays `noindex`.
- **Full catalogue management for managers:**
  - **Workshops:** create, edit and duplicate (same slot one week later). Cancel and reopen from a row menu or the workshop page.
  - **Deleting workshops:** only allowed if nobody ever registered, so booking history is never lost. Otherwise the app offers "Cancel workshop" instead.
  - **Locations:** add, rename and delete. A location in use can only be renamed.
- **Pagination:** page numbers, "Showing 1–10 of 23" and a page-size choice on every list.
  - Workshops and the activity log are paged on the server, and the next page is prefetched so it opens instantly.
  - Registrations, accounts and locations are paged in the browser, since they're already loaded.
- **Attendee search** on each workshop, matching name or email across every tab.
- **Empty states** for every list, each saying what to do next.
- **Temporary passwords:**
  - Accounts an admin creates, or whose password an admin resets, are flagged.
  - At first sign-in the person must choose their own password in a modal they can't dismiss. The rules are checked live as they type.
  - Until they do, the API refuses every other request with `403 PASSWORD_CHANGE_REQUIRED`.
  - Anyone can also change their password from the account menu; other devices are then signed out.
- **Bonus: audit trail.** Every workshop edit, account creation, role change, deactivation and password reset is recorded as a field-level diff. Managers and staff see it per workshop; Admins see it under **Activity**.
- **Bonus: waitlist.**
  - When a workshop is full, staff can add people to a waitlist.
  - A cancellation, or an increase in capacity, gives the seat to the first person waiting. This happens in the same database transaction, so nobody can jump the queue.

## API

All endpoints return JSON. Errors always have the shape `{ "error": { "code", "message", "fields?" } }`.

| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | anyone |
| POST | `/api/auth/password` (`currentPassword`, `newPassword`) | signed in, including on a temporary password |
| GET | `/api/auth/me` | signed in |
| GET, POST | `/api/users` | Admin |
| PATCH | `/api/users/:id` (name, role, isActive, password) | Admin |
| GET | `/api/workshops?from&to&includePast&status&hasSeats&locationId&q&page&pageSize` → `{ items, page, pageSize, total, totalPages }` | Manager, Staff |
| POST | `/api/workshops` | Manager |
| GET, PATCH, DELETE | `/api/workshops/:id` (DELETE only if it never had a registration, else 409) | GET: Manager, Staff · PATCH/DELETE: Manager |
| GET, POST | `/api/workshops/:id/registrations` (POST body: `attendeeName`, `attendeeEmail`, `waitlist?`) | Manager, Staff |
| POST | `/api/registrations/:id/cancel` (body: `reason?`) | Manager, Staff |
| GET | `/api/locations` (with workshop counts) | Manager, Staff |
| POST · PATCH · DELETE | `/api/locations` · `/api/locations/:id` (DELETE only if unused, else 409) | Manager |
| GET | `/api/audit-logs?entityType=user\|workshop&entityId&page&pageSize` | user: Admin · workshop: Manager, Staff |

Status codes:
- `401` when not signed in.
- `403` when the role isn't allowed.
- `400` for validation errors, with field messages.
- `409` for business-rule conflicts: `WORKSHOP_FULL`, `ALREADY_REGISTERED`, `CAPACITY_BELOW_REGISTERED`, and similar.

## Project layout

```
app/
  api/…                 REST route handlers (thin: validate → service → JSON)
  (app)/…               signed-in pages; each prefetches its data on the server
  login/                sign-in page
components/             UI (workshops/, users/, app/ shared, ui/ shadcn primitives)
hooks/queries.ts        TanStack Query hooks, including optimistic mutations
lib/
  api/handler.ts        withAuth(): session → permission → validation → error mapping
  auth/                 sessions, permission matrix, password hashing, page guard
  services/             business logic and SQL (registrations.ts holds the capacity rule)
  validation/           zod schemas shared by the API and the forms
  query/                query keys, fetch wrapper, QueryClient setup
prisma/                 schema, migration (with CHECK constraints) and seed
tests/                  concurrency and RBAC tests (Vitest, real Postgres)
scripts/hammer.ts       live HTTP concurrency demo
```

---

## Public site content

- **Front-desk contact:** the phone number, email and opening hours in `lib/brand.ts` are placeholders. Replace them before launch.
- **Categories:** each workshop's category comes from its code prefix (`POT-`, `CODE-`, `FIT-`, `ART-`). New prefixes can be added in `lib/catalogue.ts`.
- **Photos:** stored in `public/images/workshops/`, from Unsplash under the free [Unsplash License](https://unsplash.com/license):
  - [pottery](https://unsplash.com/photos/BFBikYWtA9c) and [glazing](https://unsplash.com/photos/miTlsTvoLVg)
  - [coding](https://unsplash.com/photos/kp7qkHTgSKc)
  - [fitness](https://unsplash.com/photos/3RnkZpDqsEI) and [seated stretching](https://unsplash.com/photos/kB4FXX1KXhQ)
  - [art](https://unsplash.com/photos/EiORIO-66Ow)
