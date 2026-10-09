import "server-only";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Applies `delta` to the workshop's seat counter and fills any free seats from
 * the waitlist (oldest first), all in ONE statement.
 *
 * PRECONDITION: the caller's transaction already holds the workshop row lock
 * (`SELECT … FOR UPDATE`), so the counter read here is current and no other
 * writer can interleave. Waitlisted rows are taken with SKIP LOCKED so a row
 * being cancelled concurrently is never promoted (and we never wait on it).
 *
 * Because promotion happens in the same transaction that frees the seat, there
 * is never a moment where a seat looks free while people are waiting: the
 * front desk cannot accidentally jump the queue.
 */
export async function rebalanceSeats(tx: Tx, workshopId: string, delta: number) {
  const [row] = await tx.$queryRaw<{ active_count: number; promoted: number }[]>`
    WITH w AS (
      SELECT capacity,
             active_count + ${delta}::int AS cnt,
             (status = 'SCHEDULED' AND ends_at > now()) AS open
      FROM workshops
      WHERE id = ${workshopId}::uuid
    ),
    next AS (
      SELECT r.id
      FROM registrations r
      WHERE r.workshop_id = ${workshopId}::uuid AND r.status = 'WAITLISTED'
      ORDER BY r.seq
      LIMIT (SELECT CASE WHEN open THEN GREATEST(capacity - cnt, 0) ELSE 0 END FROM w)
      FOR UPDATE SKIP LOCKED
    ),
    promoted AS (
      UPDATE registrations r
      SET status = 'ACTIVE', promoted_at = now()
      FROM next
      WHERE r.id = next.id
      RETURNING r.id
    )
    UPDATE workshops
    SET active_count = (SELECT cnt FROM w) + (SELECT count(*) FROM promoted)
    WHERE id = ${workshopId}::uuid
    RETURNING active_count, (SELECT count(*) FROM promoted)::int AS promoted`;
  return { activeCount: row.active_count, promoted: row.promoted };
}
