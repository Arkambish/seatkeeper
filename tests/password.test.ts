import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import * as meRoute from "@/app/api/auth/me/route";
import * as passwordRoute from "@/app/api/auth/password/route";
import * as userRoute from "@/app/api/users/[id]/route";
import * as usersRoute from "@/app/api/users/route";
import * as workshopsRoute from "@/app/api/workshops/route";
import { ctx, makeUser, request, resetDb } from "./helpers";

type U = Awaited<ReturnType<typeof makeUser>>;
let admin: U;

beforeAll(async () => {
  await resetDb();
  admin = await makeUser("ADMIN");
});
afterAll(() => prisma.$disconnect());

const changePassword = (token: string, body: unknown) =>
  passwordRoute.POST(request("POST", "/api/auth/password", { token, body }), ctx());
const errorCode = async (res: Response) => ((await res.json()) as { error: { code: string } }).error.code;

describe("temporary passwords", () => {
  it("accounts created by an admin must change their password", async () => {
    const res = await usersRoute.POST(
      request("POST", "/api/users", {
        token: admin.token,
        body: { name: "Nimal Perera", email: "nimal@test.local", role: "STAFF", password: "TempPass1" },
      }),
      ctx(),
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as { mustChangePassword: boolean }).mustChangePassword).toBe(true);
  });

  it("the API refuses everything except /me and changing the password until it's changed", async () => {
    const staff = await makeUser("STAFF", { password: "TempPass1", mustChangePassword: true });

    const blocked = await workshopsRoute.GET(request("GET", "/api/workshops", { token: staff.token }), ctx());
    expect(blocked.status).toBe(403);
    expect(await errorCode(blocked)).toBe("PASSWORD_CHANGE_REQUIRED");

    const me = await meRoute.GET(request("GET", "/api/auth/me", { token: staff.token }), ctx());
    expect(me.status).toBe(200);
    expect(((await me.json()) as { mustChangePassword: boolean }).mustChangePassword).toBe(true);
  });

  it("rejects a wrong current password and reusing the same password", async () => {
    const staff = await makeUser("STAFF", { password: "TempPass1", mustChangePassword: true });

    const wrong = await changePassword(staff.token, { currentPassword: "nope", newPassword: "MyOwnPass9" });
    expect(wrong.status).toBe(400);
    expect(await errorCode(wrong)).toBe("WRONG_PASSWORD");

    const same = await changePassword(staff.token, { currentPassword: "TempPass1", newPassword: "TempPass1" });
    expect(same.status).toBe(400);

    const weak = await changePassword(staff.token, { currentPassword: "TempPass1", newPassword: "abcdefgh" });
    expect(weak.status).toBe(400);
  });

  it("changing it unlocks the account, keeps this session and signs out other devices", async () => {
    const staff = await makeUser("STAFF", { password: "TempPass1", mustChangePassword: true });
    const otherDevice = await createSession(staff.id);

    const res = await changePassword(staff.token, { currentPassword: "TempPass1", newPassword: "MyOwnPass9" });
    expect(res.status).toBe(200);

    const nowAllowed = await workshopsRoute.GET(request("GET", "/api/workshops", { token: staff.token }), ctx());
    expect(nowAllowed.status).toBe(200);

    const other = await workshopsRoute.GET(request("GET", "/api/workshops", { token: otherDevice }), ctx());
    expect(other.status).toBe(401);

    const audit = await prisma.auditLog.findFirst({ where: { entityId: staff.id, action: "user.password_change" } });
    expect(audit?.actorId).toBe(staff.id);
  });

  it("an admin password reset makes it temporary again", async () => {
    const staff = await makeUser("STAFF", { password: "MyOwnPass9" });
    await userRoute.PATCH(
      request("PATCH", "/api/users/x", { token: admin.token, body: { password: "TempPass2" } }),
      ctx({ id: staff.id }),
    );
    const row = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } });
    expect(row.mustChangePassword).toBe(true);
  });
});
