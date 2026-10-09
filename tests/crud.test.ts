import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import * as locationRoute from "@/app/api/locations/[id]/route";
import * as locationsRoute from "@/app/api/locations/route";
import * as workshopRoute from "@/app/api/workshops/[id]/route";
import * as workshopsRoute from "@/app/api/workshops/route";
import { registerAttendee } from "@/lib/services/registrations";
import { cancelRegistration } from "@/lib/services/registrations";
import type { Location, Paged, Workshop } from "@/lib/types";
import { ctx, makeUser, makeWorkshop, request, resetDb } from "./helpers";

type U = Awaited<ReturnType<typeof makeUser>>;
let admin: U, manager: U, staff: U;

beforeAll(async () => {
  await resetDb();
  [admin, manager, staff] = await Promise.all([makeUser("ADMIN"), makeUser("MANAGER"), makeUser("STAFF")]);
});
afterAll(() => prisma.$disconnect());

const del = (token: string, id: string) =>
  workshopRoute.DELETE(request("DELETE", `/api/workshops/${id}`, { token }), ctx({ id }));
const code = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

describe("deleting workshops", () => {
  it("a manager can delete a workshop nobody ever registered for (and it's audited)", async () => {
    const w = await makeWorkshop(manager.id);
    expect((await del(manager.token, w.id)).status).toBe(204);
    expect(await prisma.workshop.findUnique({ where: { id: w.id } })).toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { entityId: w.id, action: "workshop.delete" } });
    expect(audit?.actorId).toBe(manager.id);
    expect((audit?.before as { code: string }).code).toBe(w.code);
  });

  it("refuses once anyone registered, even if they later cancelled (history is kept)", async () => {
    const w = await makeWorkshop(manager.id);
    const r = await registerAttendee(w.id, { attendeeName: "Ashan Perera", attendeeEmail: "ashan@x.test", waitlist: false }, staff);
    await cancelRegistration(r.id, staff);

    const res = await del(manager.token, w.id);
    expect(res.status).toBe(409);
    expect(await code(res)).toBe("WORKSHOP_HAS_REGISTRATIONS");
    expect(await prisma.registration.count({ where: { workshopId: w.id } })).toBe(1);
  });

  it("staff and admins cannot delete workshops", async () => {
    const w = await makeWorkshop(manager.id);
    expect((await del(staff.token, w.id)).status).toBe(403);
    expect((await del(admin.token, w.id)).status).toBe(403);
  });
});

describe("locations CRUD", () => {
  const create = (token: string, name: string) =>
    locationsRoute.POST(request("POST", "/api/locations", { token, body: { name } }), ctx());

  it("manager creates, renames and deletes an unused location; duplicates are refused", async () => {
    const res = await create(manager.token, "Kandy Road Studio");
    expect(res.status).toBe(201);
    const loc = (await res.json()) as Location;

    expect((await create(manager.token, "Kandy Road Studio")).status).toBe(409);

    const renamed = await locationRoute.PATCH(
      request("PATCH", `/api/locations/${loc.id}`, { token: manager.token, body: { name: "Kandy Road Hall" } }),
      ctx({ id: loc.id }),
    );
    expect(renamed.status).toBe(200);
    expect(((await renamed.json()) as Location).name).toBe("Kandy Road Hall");

    const gone = await locationRoute.DELETE(request("DELETE", "/x", { token: manager.token }), ctx({ id: loc.id }));
    expect(gone.status).toBe(204);
  });

  it("a location in use cannot be deleted", async () => {
    const w = await makeWorkshop(manager.id);
    const res = await locationRoute.DELETE(request("DELETE", "/x", { token: manager.token }), ctx({ id: w.locationId }));
    expect(res.status).toBe(409);
    expect(await code(res)).toBe("LOCATION_IN_USE");
  });

  it("only managers may change locations; staff can still read them", async () => {
    expect((await create(staff.token, "Galle Centre")).status).toBe(403);
    expect((await create(admin.token, "Galle Centre")).status).toBe(403);
    const list = await locationsRoute.GET(request("GET", "/api/locations", { token: staff.token }), ctx());
    expect(list.status).toBe(200);
  });
});

describe("pagination", () => {
  it("returns pages with totals and no overlap between pages", async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE registrations, workshops RESTART IDENTITY CASCADE`);
    for (let i = 0; i < 23; i++) await makeWorkshop(manager.id);

    const get = async (page: number) =>
      (await (
        await workshopsRoute.GET(
          request("GET", `/api/workshops?includePast=true&page=${page}&pageSize=10`, { token: staff.token }),
          ctx(),
        )
      ).json()) as Paged<Workshop>;

    const [p1, p2, p3] = await Promise.all([get(1), get(2), get(3)]);
    expect([p1.items.length, p2.items.length, p3.items.length]).toEqual([10, 10, 3]);
    expect(p1).toMatchObject({ page: 1, pageSize: 10, total: 23, totalPages: 3 });
    const ids = [...p1.items, ...p2.items, ...p3.items].map((w) => w.id);
    expect(new Set(ids).size).toBe(23);
  });
});
