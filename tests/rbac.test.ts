import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import * as auditRoute from "@/app/api/audit-logs/route";
import * as cancelRoute from "@/app/api/registrations/[id]/cancel/route";
import * as userRoute from "@/app/api/users/[id]/route";
import * as usersRoute from "@/app/api/users/route";
import * as registrationsRoute from "@/app/api/workshops/[id]/registrations/route";
import * as workshopRoute from "@/app/api/workshops/[id]/route";
import * as workshopsRoute from "@/app/api/workshops/route";
import { ctx, makeUser, makeWorkshop, request, resetDb } from "./helpers";

type U = Awaited<ReturnType<typeof makeUser>>;
let admin: U, manager: U, staff: U, workshopId: string, locationId: string;

beforeAll(async () => {
  await resetDb();
  [admin, manager, staff] = await Promise.all([makeUser("ADMIN"), makeUser("MANAGER"), makeUser("STAFF")]);
  const w = await makeWorkshop(manager.id, { capacity: 5 });
  workshopId = w.id;
  locationId = w.locationId;
});
afterAll(() => prisma.$disconnect());

const newWorkshop = () => ({
  code: `NEW-${Math.floor(Math.random() * 1e6)}`,
  title: "New",
  instructor: "I",
  locationId,
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
  endsAt: new Date(Date.now() + 90_000_000).toISOString(),
  capacity: 10,
});
const newUser = () => ({ name: "N", email: `n${Math.random()}@t.local`, role: "STAFF", password: "password1" });
const attendee = () => ({ attendeeName: "A", attendeeEmail: `a${Math.random()}@t.local` });

// [description, call, expected status per role]
const cases: [string, (t?: string) => Promise<Response>, { admin: number; manager: number; staff: number }][] = [
  ["list users", (t) => usersRoute.GET(request("GET", "/api/users", { token: t }), ctx()), { admin: 200, manager: 403, staff: 403 }],
  ["create user", (t) => usersRoute.POST(request("POST", "/api/users", { token: t, body: newUser() }), ctx()), { admin: 201, manager: 403, staff: 403 }],
  ["change a role", (t) => userRoute.PATCH(request("PATCH", "/api/users/x", { token: t, body: { name: "Renamed" } }), ctx({ id: staff.id })), { admin: 200, manager: 403, staff: 403 }],
  ["list workshops", (t) => workshopsRoute.GET(request("GET", "/api/workshops", { token: t }), ctx()), { admin: 403, manager: 200, staff: 200 }],
  ["view workshop", (t) => workshopRoute.GET(request("GET", "/api/workshops/x", { token: t }), ctx({ id: workshopId })), { admin: 403, manager: 200, staff: 200 }],
  ["create workshop", (t) => workshopsRoute.POST(request("POST", "/api/workshops", { token: t, body: newWorkshop() }), ctx()), { admin: 403, manager: 201, staff: 403 }],
  ["edit workshop", (t) => workshopRoute.PATCH(request("PATCH", "/api/workshops/x", { token: t, body: { title: "Edited" } }), ctx({ id: workshopId })), { admin: 403, manager: 200, staff: 403 }],
  ["view registrations", (t) => registrationsRoute.GET(request("GET", "/api/workshops/x/registrations", { token: t }), ctx({ id: workshopId })), { admin: 403, manager: 200, staff: 200 }],
  ["register attendee", (t) => registrationsRoute.POST(request("POST", "/api/workshops/x/registrations", { token: t, body: attendee() }), ctx({ id: workshopId })), { admin: 403, manager: 201, staff: 201 }],
  ["view account audit", (t) => auditRoute.GET(request("GET", "/api/audit-logs?entityType=user", { token: t }), ctx()), { admin: 200, manager: 403, staff: 403 }],
  ["view workshop audit", (t) => auditRoute.GET(request("GET", "/api/audit-logs?entityType=workshop", { token: t }), ctx()), { admin: 403, manager: 200, staff: 200 }],
];

describe("access control is enforced by the API", () => {
  for (const [name, call, expected] of cases) {
    it(`${name}: admin ${expected.admin}, manager ${expected.manager}, staff ${expected.staff}, anonymous 401`, async () => {
      expect((await call(admin.token)).status).toBe(expected.admin);
      expect((await call(manager.token)).status).toBe(expected.manager);
      expect((await call(staff.token)).status).toBe(expected.staff);
      expect((await call(undefined)).status).toBe(401);
    });
  }

  it("admin cannot cancel registrations; staff can", async () => {
    const res = await registrationsRoute.POST(
      request("POST", "/api/workshops/x/registrations", { token: staff.token, body: attendee() }),
      ctx({ id: workshopId }),
    );
    const reg = (await res.json()) as { id: string };
    const call = (t: string) => cancelRoute.POST(request("POST", "/api/registrations/x/cancel", { token: t }), ctx({ id: reg.id }));
    expect((await call(admin.token)).status).toBe(403);
    expect((await call(staff.token)).status).toBe(200);
  });

  it("a role change takes effect on the very next request", async () => {
    const victim = await makeUser("MANAGER");
    const before = await workshopsRoute.GET(request("GET", "/api/workshops", { token: victim.token }), ctx());
    expect(before.status).toBe(200);

    await userRoute.PATCH(request("PATCH", "/api/users/x", { token: admin.token, body: { role: "STAFF" } }), ctx({ id: victim.id }));
    // Sessions are revoked on role change, so the old cookie no longer works.
    const after = await workshopsRoute.GET(request("GET", "/api/workshops", { token: victim.token }), ctx());
    expect(after.status).toBe(401);
  });

  it("rejects cross-site mutations (Origin mismatch)", async () => {
    const req = request("POST", "/api/workshops/x/registrations", { token: staff.token, body: attendee() });
    req.headers.set("origin", "https://evil.example");
    const res = await registrationsRoute.POST(req, ctx({ id: workshopId }));
    expect(res.status).toBe(403);
  });

  it("returns 400 with field errors for invalid input", async () => {
    const res = await registrationsRoute.POST(
      request("POST", "/api/workshops/x/registrations", { token: staff.token, body: { attendeeName: "", attendeeEmail: "nope" } }),
      ctx({ id: workshopId }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { fields: Record<string, string[]> } };
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["attendeeName", "attendeeEmail"]));
  });
});
