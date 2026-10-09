import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { cancelRegistration, registerAttendee } from "@/lib/services/registrations";
import { updateWorkshop } from "@/lib/services/workshops";
import { makeUser, makeWorkshop, resetDb } from "./helpers";

const outcome = (r: PromiseSettledResult<unknown>) =>
  r.status === "fulfilled" ? "ok" : r.reason instanceof AppError ? r.reason.code : String(r.reason);

async function counts(workshopId: string) {
  const [w, active, waitlisted] = await Promise.all([
    prisma.workshop.findUniqueOrThrow({ where: { id: workshopId } }),
    prisma.registration.count({ where: { workshopId, status: "ACTIVE" } }),
    prisma.registration.count({ where: { workshopId, status: "WAITLISTED" } }),
  ]);
  return { activeCount: w.activeCount, active, waitlisted };
}

describe("capacity rule under concurrency", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("50 simultaneous registrations for 20 seats → exactly 20 succeed", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 20 });

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, (_, i) =>
        registerAttendee(w.id, { attendeeName: `P${i}`, attendeeEmail: `p${i}@x.test`, waitlist: false }, staff),
      ),
    );
    const tally = results.map(outcome).reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});

    const unexpected = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected" && !(r.reason instanceof AppError))
      .map((r) => String(r.reason));
    expect(unexpected, "non-domain errors").toEqual([]);
    expect(tally).toEqual({ ok: 20, WORKSHOP_FULL: 30 });
    expect(await counts(w.id)).toMatchObject({ activeCount: 20, active: 20 });
  });

  it("the same person registered twice at once → one booking", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 5 });

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        registerAttendee(w.id, { attendeeName: "Dup", attendeeEmail: "dup@x.test", waitlist: false }, staff),
      ),
    );
    expect(results.map(outcome).sort()).toEqual(["ALREADY_REGISTERED", "ALREADY_REGISTERED", "ALREADY_REGISTERED", "ALREADY_REGISTERED", "ok"]);
    // The failed attempts must not have leaked seats.
    expect(await counts(w.id)).toMatchObject({ activeCount: 1, active: 1 });
  });

  it("double cancel at once → one cancellation, seat freed once, history kept", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 3 });
    const reg = await registerAttendee(w.id, { attendeeName: "A", attendeeEmail: "a@x.test", waitlist: false }, staff);

    const results = await Promise.allSettled([cancelRegistration(reg.id, staff), cancelRegistration(reg.id, staff)]);
    expect(results.map(outcome).sort()).toEqual(["ALREADY_CANCELLED", "ok"]);

    const row = await prisma.registration.findUniqueOrThrow({ where: { id: reg.id } });
    expect(row).toMatchObject({ status: "CANCELLED", cancelledById: staff.id });
    expect(row.cancelledAt).toBeInstanceOf(Date);
    expect(await counts(w.id)).toMatchObject({ activeCount: 0, active: 0 });
  });

  it("cancellations racing new registrations never exceed capacity", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 10 });
    const regs = [];
    for (let i = 0; i < 10; i++) {
      regs.push(await registerAttendee(w.id, { attendeeName: `R${i}`, attendeeEmail: `r${i}@x.test`, waitlist: false }, staff));
    }

    await Promise.allSettled([
      ...regs.slice(0, 5).map((r) => cancelRegistration(r.id, staff)),
      ...Array.from({ length: 20 }, (_, i) =>
        registerAttendee(w.id, { attendeeName: `N${i}`, attendeeEmail: `n${i}@x.test`, waitlist: false }, staff),
      ),
    ]);

    const c = await counts(w.id);
    expect(c.active).toBeLessThanOrEqual(10);
    expect(c.activeCount).toBe(c.active);
  });

  it("the database itself rejects an over-capacity counter (CHECK constraint)", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 2 });
    await expect(prisma.workshop.update({ where: { id: w.id }, data: { activeCount: 3 } })).rejects.toThrow();
  });
});

describe("waitlist", () => {
  beforeEach(resetDb);

  it("cancelling an active seat promotes the oldest waitlisted attendee atomically", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 1 });
    const first = await registerAttendee(w.id, { attendeeName: "A", attendeeEmail: "a@x.test", waitlist: false }, staff);

    await expect(
      registerAttendee(w.id, { attendeeName: "B", attendeeEmail: "b@x.test", waitlist: false }, staff),
    ).rejects.toMatchObject({ code: "WORKSHOP_FULL" });
    const b = await registerAttendee(w.id, { attendeeName: "B", attendeeEmail: "b@x.test", waitlist: true }, staff);
    await registerAttendee(w.id, { attendeeName: "C", attendeeEmail: "c@x.test", waitlist: true }, staff);
    // Simulate B and C joining in the same millisecond: order must still be B, C.
    await prisma.registration.updateMany({ where: { workshopId: w.id, status: "WAITLISTED" }, data: { registeredAt: new Date() } });

    const { promoted } = await cancelRegistration(first.id, staff);
    expect(promoted).toBe(1);
    const bRow = await prisma.registration.findUniqueOrThrow({ where: { id: b.id } });
    expect(bRow.status).toBe("ACTIVE");
    expect(bRow.promotedAt).toBeInstanceOf(Date);
    expect(await counts(w.id)).toEqual({ activeCount: 1, active: 1, waitlisted: 1 });
  });

  it("joining the waitlist is refused while seats are free", async () => {
    const staff = await makeUser("STAFF");
    const w = await makeWorkshop(staff.id, { capacity: 2 });
    await expect(
      registerAttendee(w.id, { attendeeName: "A", attendeeEmail: "a@x.test", waitlist: true }, staff),
    ).rejects.toMatchObject({ code: "WORKSHOP_HAS_SEATS" });
  });

  it("raising capacity promotes from the waitlist; lowering below registrations is refused", async () => {
    const manager = await makeUser("MANAGER");
    const w = await makeWorkshop(manager.id, { capacity: 1 });
    await registerAttendee(w.id, { attendeeName: "A", attendeeEmail: "a@x.test", waitlist: false }, manager);
    await registerAttendee(w.id, { attendeeName: "B", attendeeEmail: "b@x.test", waitlist: true }, manager);

    await updateWorkshop(w.id, { capacity: 3 }, manager.id);
    expect(await counts(w.id)).toEqual({ activeCount: 2, active: 2, waitlisted: 0 });

    await expect(updateWorkshop(w.id, { capacity: 1 }, manager.id)).rejects.toMatchObject({
      code: "CAPACITY_BELOW_REGISTERED",
    });
  });
});
