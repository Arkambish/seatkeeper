# Seatkeeper: design notes

## Stack and why
- **Next.js (App Router), TypeScript.** One app serves both the REST API (`app/api/*`) and the UI: one deploy, one language, shared types. I used a real HTTP API instead of Server Actions so it can be tested with curl and reviewed directly.
- **PostgreSQL with Prisma.** The capacity rule relies on Postgres row locks, CHECK constraints and partial unique indexes. Prisma handles the schema, migrations and typed queries; the two hot write paths are hand-written SQL.
- **TanStack Query and zod.** TanStack Query handles caching, optimistic updates and background refresh. The zod schemas are shared by the API and the forms, so each validation rule exists once.
- **UI.** Tailwind with shadcn/Base UI in a calm, warm-monochrome style. Colour only carries meaning: Full, Last seat, Cancelled.

## How over-registration is prevented
Claiming a seat and recording the registration is **one SQL statement** (`lib/services/registrations.ts`):
```sql
WITH seat AS (UPDATE workshops SET active_count = active_count + 1
              WHERE id = $1 AND status = 'SCHEDULED' AND ends_at > now() AND active_count < capacity
              RETURNING id)
INSERT INTO registrations (…) SELECT … FROM seat RETURNING …;
```
1. **One request wins the last seat.** The UPDATE locks the workshop row, so simultaneous requests queue. Under READ COMMITTED, Postgres re-checks `active_count < capacity` against the newly committed row, so exactly one request gets the last seat and the rest get `409 WORKSHOP_FULL`. The count is never read and then written in separate steps, so there's no race.
2. **The database enforces it independently.** `CHECK (active_count BETWEEN 0 AND capacity)` holds even if application code is wrong. A partial unique index on `(workshop_id, lower(email))` for live bookings blocks double-booking the same person, and rolls back the counter with it.
3. **Cancelling never deletes.** It locks the registration and then the workshop, marks the row `CANCELLED` with who and when, and frees the seat or gives it to the first person on the waitlist (`SKIP LOCKED`). Locks are always taken in the same order, so it can't deadlock. Capacity can't be lowered below current registrations; raising it promotes people from the waitlist.

**Proof.** `tests/concurrency.test.ts` runs 50 parallel registrations for 20 seats and gets exactly 20. It also covers double cancels, the same email twice, and cancellations racing new bookings. `npm run hammer` shows the same over HTTP: 60 requests for 10 seats on Neon gave exactly 10.

## Other decisions
- **Access control lives in one place.** `lib/auth/permissions.ts` holds the matrix. `withAuth(permission, handler)` wraps every route: no session → 401, wrong role → 403. Pages use the same matrix to redirect, but the API never trusts the UI.
- **Database sessions, not JWTs.** The cookie is an httpOnly random token, and only its hash is stored. Each request reads the role fresh in one query, so a role change or deactivation takes effect immediately; those changes also revoke sessions. Logins are rate-limited, bcrypt runs even for unknown emails, and mutations get an Origin check on top of the SameSite cookie.
- **Temporary passwords.** Accounts an admin creates or resets carry `must_change_password`. `withAuth` refuses everything except `/auth/me` and `/auth/password` until it's cleared. The UI shows a modal that can't be dismissed, and changing the password signs out the person's other devices.
- **A denormalised `active_count`.** It makes the single-statement claim possible and turns "has free seats" into a cheap column comparison. The cost is keeping it in sync: every write goes through the locked paths, and the tests assert it matches the active rows.
- **Cancel is `POST /registrations/:id/cancel`, not `DELETE`.** Records are never removed. Workshop and account changes also write a before/after audit entry in the same transaction.
- **Latency.** Registering is one database round trip. Pages prefetch on the server under the same query keys the client uses, so the first paint has data and makes no API calls; a static shell streams first. Registering and cancelling update the UI optimistically and roll back if refused. Lists use keyset pagination and have no `COUNT(*)`. Seat counts refresh every 15 seconds while visible.

## Assumptions
- Admins only manage accounts; the matrix gives them no workshop access.
- All three locations share one timezone (`NEXT_PUBLIC_APP_TIMEZONE`).
- An attendee is identified by email within a workshop and can re-register after cancelling.
- Registration stays open until a workshop ends, so late arrivals can be booked.
- Managers set status by hand; workshops aren't marked completed automatically.

## Skipped
- No end-to-end browser test suite. The rules are covered by API tests and were checked by hand in a browser.
- The login rate limiter is in memory, per instance; multiple instances would need Redis.
- No invite emails or 2FA. Admins hand over temporary passwords in person; people replace them at first sign-in.
- No email notification when someone is promoted from the waitlist; it's shown in the UI only.
- No attendee search across workshops.
- Tables scroll sideways on phones rather than becoming cards.
