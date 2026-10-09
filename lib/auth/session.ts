import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "wr_session";
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // refresh sliding expiry at most hourly

export type AuthUser = { id: string; name: string; email: string; role: Role };

const ttlMs = () => env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * The cookie lives up to 30 days; the server-side session expires after
 * SESSION_TTL_DAYS of inactivity (sliding). Whichever comes first wins.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};

/**
 * Creates a session row and returns the raw token. Only the SHA-256 hash is
 * stored, so a leaked database dump cannot be replayed as live sessions.
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs());
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return token;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/**
 * Resolves a raw session token to its user in ONE indexed query (session +
 * user joined). The role is read fresh from the DB on every request, so a
 * role change or deactivation takes effect immediately.
 */
export async function getUserFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    relationLoadStrategy: "join",
    select: {
      id: true,
      expiresAt: true,
      lastSeenAt: true,
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });

  const now = Date.now();
  if (!session || session.expiresAt.getTime() <= now || !session.user.isActive) return null;

  // Sliding expiry without a write on every request.
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now), expiresAt: new Date(now + ttlMs()) },
    });
  }

  const { isActive: _isActive, ...user } = session.user;
  return user;
}

/** For Server Components: deduplicated per request via React `cache`. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserFromToken(token);
});
