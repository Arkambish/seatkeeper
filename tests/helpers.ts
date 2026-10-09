import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE, type AuthUser } from "@/lib/auth/session";

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE audit_logs, registrations, workshops, locations, sessions, users RESTART IDENTITY CASCADE`,
  );
}

let seq = 0;
export async function makeUser(
  role: Role,
  opts: { password?: string; mustChangePassword?: boolean } = {},
): Promise<AuthUser & { token: string }> {
  seq += 1;
  const user = await prisma.user.create({
    data: {
      name: `${role} ${seq}`,
      email: `${role.toLowerCase()}${seq}@test.local`,
      role,
      passwordHash: opts.password ? await hashPassword(opts.password) : "x",
      mustChangePassword: opts.mustChangePassword ?? false,
    },
    select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
  });
  return { ...user, token: await createSession(user.id) };
}

export async function makeWorkshop(createdById: string, overrides: { capacity?: number; status?: "SCHEDULED" | "CANCELLED" } = {}) {
  seq += 1;
  const location = await prisma.location.upsert({ where: { name: "Test" }, update: {}, create: { name: "Test" } });
  return prisma.workshop.create({
    data: {
      code: `T-${seq}`,
      title: `Test workshop ${seq}`,
      instructor: "Instructor",
      locationId: location.id,
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 90_000_000),
      capacity: overrides.capacity ?? 20,
      status: overrides.status ?? "SCHEDULED",
      createdById,
      updatedById: createdById,
    },
  });
}

/** Builds a request the way a browser would send it, with the session cookie. */
export function request(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.token) headers.set("cookie", `${SESSION_COOKIE}=${opts.token}`);
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
}

export const ctx = <P extends Record<string, string>>(params: P = {} as P) => ({
  params: Promise.resolve(params),
});
