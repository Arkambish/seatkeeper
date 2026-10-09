import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, isUniqueViolation } from "@/lib/errors";
import { hashPassword } from "@/lib/auth/password";
import type { User } from "@/lib/types";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/users";
import { diff, recordAudit } from "./audit";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const toUser = (u: Prisma.UserGetPayload<{ select: typeof userSelect }>): User => ({
  ...u,
  createdAt: u.createdAt.toISOString(),
});

export async function listUsers(): Promise<User[]> {
  const rows = await prisma.user.findMany({
    select: userSelect,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(toUser);
}

export async function createUser(input: CreateUserInput, actorId: string): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: { id, name: input.name, email: input.email, role: input.role, passwordHash },
        select: userSelect,
      }),
      prisma.auditLog.create({
        data: {
          actorId,
          action: "user.create",
          entityType: "user",
          entityId: id,
          after: { name: input.name, email: input.email, role: input.role },
        },
      }),
    ]);
    return toUser(user);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new AppError("DUPLICATE", "An account with this email already exists.", {
        email: ["Email already in use"],
      });
    }
    throw e;
  }
}

/**
 * Role changes, deactivation and password resets revoke the user's sessions, so
 * the change takes effect immediately (sessions are DB-backed, not JWTs).
 *
 * Guards: admins can't lock themselves out, and the last active admin can't be
 * removed. The admin rows are locked so two admins demoting each other at the
 * same moment can't leave the centre with zero admins.
 */
export async function updateUser(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
  const isSelf = id === actorId;
  if (isSelf && input.role !== undefined && input.role !== "ADMIN") {
    throw new AppError("CONFLICT", "You can't remove your own admin role.");
  }
  if (isSelf && input.isActive === false) {
    throw new AppError("CONFLICT", "You can't deactivate your own account.");
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  return prisma.$transaction(async (tx) => {
    const admins = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE role = 'ADMIN' AND is_active FOR UPDATE`;

    const before = await tx.user.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "User not found.");

    const losesAdmin =
      before.role === "ADMIN" &&
      before.isActive &&
      ((input.role !== undefined && input.role !== "ADMIN") || input.isActive === false);
    if (losesAdmin && admins.length <= 1) {
      throw new AppError("CONFLICT", "There must always be at least one active admin.");
    }

    const { password: _password, ...profile } = input;
    const changes = diff(before, profile);

    const user = await tx.user.update({
      where: { id },
      data: { ...profile, ...(passwordHash && { passwordHash }) },
      select: userSelect,
    });

    const revoke =
      passwordHash !== undefined ||
      (changes && ("role" in changes.after || "isActive" in changes.after));
    if (revoke) await tx.session.deleteMany({ where: { userId: id } });

    if (changes) {
      const action =
        "role" in changes.after
          ? "user.role_change"
          : "isActive" in changes.after
            ? changes.after.isActive
              ? "user.activate"
              : "user.deactivate"
            : "user.update";
      await recordAudit(tx, { actorId, action, entityType: "user", entityId: id, ...changes });
    }
    if (passwordHash) {
      await recordAudit(tx, { actorId, action: "user.password_reset", entityType: "user", entityId: id });
    }
    return toUser(user);
  });
}
