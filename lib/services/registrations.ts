import "server-only";
import { prisma } from "@/lib/db";
import { AppError, isUniqueViolation } from "@/lib/errors";
import type { AuthUser } from "@/lib/auth/session";
import type { Registration, RegistrationStatus } from "@/lib/types";
import type { RegisterAttendeeInput } from "@/lib/validation/registrations";
import { rebalanceSeats } from "./seats";

type InsertedRow = {
  id: string;
  workshop_id: string;
  attendee_name: string;
  attendee_email: string;
  status: RegistrationStatus;
  registered_at: Date;
};

const fromInserted = (r: InsertedRow, actor: AuthUser): Registration => ({
  id: r.id,
  workshopId: r.workshop_id,
  attendeeName: r.attendee_name,
  attendeeEmail: r.attendee_email,
  status: r.status,
  registeredAt: r.registered_at.toISOString(),
  registeredBy: { id: actor.id, name: actor.name },
  cancelledAt: null,
  cancelledBy: null,
  cancelReason: null,
  promotedAt: null,
});

/**
 * THE CAPACITY RULE.
 *
 * Claiming a seat and inserting the registration is a single SQL statement, so
 * it is atomic and costs one database round trip.
 *
 * The UPDATE only matches while `active_count < capacity`. It takes a row lock
 * on the workshop, so concurrent requests for the same workshop queue up. Under
 * READ COMMITTED, Postgres re-checks the WHERE clause against the latest
 * committed row once the lock is free. Exactly one request wins the last seat
 * and every other request matches zero rows. There is no "read, then write" gap.
 *
 * As a second line of defence, a CHECK constraint (active_count <= capacity)
 * makes over-booking impossible at the database level even if this code is
 * changed incorrectly.
 */
export async function registerAttendee(
  workshopId: string,
  input: RegisterAttendeeInput,
  actor: AuthUser,
): Promise<Registration> {
  if (input.waitlist) return joinWaitlist(workshopId, input, actor);

  let rows: InsertedRow[];
  try {
    rows = await prisma.$queryRaw<InsertedRow[]>`
      WITH seat AS (
        UPDATE workshops
        SET active_count = active_count + 1
        WHERE id = ${workshopId}::uuid
          AND status = 'SCHEDULED'
          AND ends_at > now()
          AND active_count < capacity
        RETURNING id
      )
      INSERT INTO registrations (workshop_id, attendee_name, attendee_email, status, registered_by_id)
      SELECT seat.id, ${input.attendeeName}, ${input.attendeeEmail}, 'ACTIVE'::"RegistrationStatus", ${actor.id}::uuid
      FROM seat
      RETURNING id, workshop_id, attendee_name, attendee_email, status, registered_at`;
  } catch (e) {
    // The partial unique index fired. The whole statement rolls back,
    // including the counter increment.
    if (isUniqueViolation(e)) throw alreadyRegistered(input.attendeeEmail);
    throw e;
  }

  if (rows.length) return fromInserted(rows[0], actor);
  // No seat was claimed. Only on this slow path do we read the workshop, to
  // explain why.
  throw await explainRejection(workshopId, "register");
}

/**
 * Waitlist (bonus). Only allowed when the workshop is genuinely full. The
 * workshop row is locked so this cannot race with a cancellation that frees a
 * seat. If a seat was freed meanwhile, the caller is told to register normally.
 */
async function joinWaitlist(
  workshopId: string,
  input: RegisterAttendeeInput,
  actor: AuthUser,
): Promise<Registration> {
  let rows: InsertedRow[];
  try {
    rows = await prisma.$queryRaw<InsertedRow[]>`
      WITH w AS (
        SELECT id FROM workshops
        WHERE id = ${workshopId}::uuid
          AND status = 'SCHEDULED'
          AND ends_at > now()
          AND active_count >= capacity
        FOR UPDATE
      )
      INSERT INTO registrations (workshop_id, attendee_name, attendee_email, status, registered_by_id)
      SELECT w.id, ${input.attendeeName}, ${input.attendeeEmail}, 'WAITLISTED'::"RegistrationStatus", ${actor.id}::uuid
      FROM w
      RETURNING id, workshop_id, attendee_name, attendee_email, status, registered_at`;
  } catch (e) {
    if (isUniqueViolation(e)) throw alreadyRegistered(input.attendeeEmail);
    throw e;
  }
  if (rows.length) return fromInserted(rows[0], actor);
  throw await explainRejection(workshopId, "waitlist");
}

async function explainRejection(workshopId: string, mode: "register" | "waitlist") {
  const w = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true, endsAt: true, capacity: true, activeCount: true },
  });
  if (!w) return new AppError("NOT_FOUND", "Workshop not found.");
  if (w.status !== "SCHEDULED" || w.endsAt <= new Date()) {
    return new AppError("WORKSHOP_NOT_OPEN", "This workshop is not open for registration.");
  }
  if (mode === "waitlist") {
    return new AppError("WORKSHOP_HAS_SEATS", "A seat is free, so register them directly.");
  }
  return new AppError("WORKSHOP_FULL", `This workshop is full (${w.capacity} of ${w.capacity} seats taken).`);
}

const alreadyRegistered = (email: string) =>
  new AppError("ALREADY_REGISTERED", `${email} is already registered or waitlisted for this workshop.`, {
    attendeeEmail: ["Already registered for this workshop"],
  });

/**
 * Cancels without deleting: the row keeps who cancelled it, when, and why.
 * Locks are always taken registration first, then workshop. Nothing else waits
 * on a specific registration while holding the workshop lock (promotion uses
 * SKIP LOCKED), so this cannot deadlock.
 */
export async function cancelRegistration(registrationId: string, actor: AuthUser, reason?: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the registration. Its status can't change under us from here on.
    const [reg] = await tx.$queryRaw<{ status: RegistrationStatus; workshop_id: string }[]>`
      SELECT status, workshop_id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`;
    if (!reg) throw new AppError("NOT_FOUND", "Registration not found.");
    if (reg.status === "CANCELLED") {
      throw new AppError("ALREADY_CANCELLED", "This registration was already cancelled.");
    }

    // 2. Lock the workshop and mark the registration cancelled in one statement.
    await tx.$executeRaw`
      WITH lock AS (SELECT id FROM workshops WHERE id = ${reg.workshop_id}::uuid FOR UPDATE)
      UPDATE registrations
      SET status = 'CANCELLED', cancelled_at = now(), cancelled_by_id = ${actor.id}::uuid,
          cancel_reason = ${reason ?? null}
      WHERE id = ${registrationId}::uuid AND EXISTS (SELECT 1 FROM lock)`;

    // 3. Free the seat (if it held one) and hand it to the next person waiting.
    const { promoted } = await rebalanceSeats(tx, reg.workshop_id, reg.status === "ACTIVE" ? -1 : 0);
    return { workshopId: reg.workshop_id, promoted };
  });
}

export async function listRegistrations(
  workshopId: string,
  status?: RegistrationStatus,
): Promise<Registration[]> {
  const rows = await prisma.registration.findMany({
    where: { workshopId, ...(status && { status }) },
    // Waitlist in queue order; everything else newest first. `seq` breaks
    // same-millisecond ties so the order always matches the real queue.
    orderBy: status === "WAITLISTED" ? [{ seq: "asc" }] : [{ registeredAt: "desc" }, { seq: "desc" }],
    relationLoadStrategy: "join",
    select: {
      id: true,
      workshopId: true,
      attendeeName: true,
      attendeeEmail: true,
      status: true,
      registeredAt: true,
      cancelledAt: true,
      cancelReason: true,
      promotedAt: true,
      registeredBy: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    ...r,
    registeredAt: r.registeredAt.toISOString(),
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    promotedAt: r.promotedAt?.toISOString() ?? null,
  }));
}
