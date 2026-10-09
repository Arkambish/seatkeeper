import { json, parseBody, publicRoute } from "@/lib/api/handler";
import { homePathFor } from "@/lib/auth/permissions";
import { verifyPassword } from "@/lib/auth/password";
import { clearAttempts, tooManyAttempts } from "@/lib/auth/rate-limit";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation/auth";

export const POST = publicRoute(async ({ req }) => {
  const { email, password } = await parseBody(req, loginSchema);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  if (tooManyAttempts(key)) {
    throw new AppError("RATE_LIMITED", "Too many sign-in attempts. Please wait a few minutes.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      mustChangePassword: true,
    },
  });
  // Always run bcrypt (even for unknown emails) and return one generic message.
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid || !user.isActive) {
    throw new AppError("INVALID_CREDENTIALS", "Incorrect email or password.");
  }
  clearAttempts(key);

  const token = await createSession(user.id);
  const res = json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    redirectTo: homePathFor(user.role),
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
});
