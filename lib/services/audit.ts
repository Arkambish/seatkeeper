import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AuditEntry, Page } from "@/lib/types";
import { decodeCursor, encodeCursor } from "./cursor";

export type AuditEntityType = AuditEntry["entityType"];

type Tx = Prisma.TransactionClient;

/** Records who changed what. Called inside the same transaction as the change. */
export function recordAudit(
  tx: Tx,
  entry: {
    actorId: string;
    action: string;
    entityType: AuditEntityType;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  },
) {
  return tx.auditLog.create({
    data: {
      ...entry,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** Only the fields that actually changed, so the log reads like a diff. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    const prev = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
    const next = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key];
    if (next !== undefined && prev !== next) {
      b[key] = prev;
      a[key] = next;
    }
  }
  return Object.keys(a).length ? { before: b, after: a } : null;
}

export async function listAudit(opts: {
  entityType: AuditEntityType;
  entityId?: string;
  cursor?: string;
  limit?: number;
}): Promise<Page<AuditEntry>> {
  const limit = opts.limit ?? 30;
  const c = opts.cursor ? decodeCursor(opts.cursor) : null;

  const rows = await prisma.auditLog.findMany({
    where: {
      entityType: opts.entityType,
      ...(opts.entityId && { entityId: opts.entityId }),
      ...(c && { OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    relationLoadStrategy: "join",
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      before: true,
      after: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((r) => ({
      ...r,
      entityType: r.entityType as AuditEntityType,
      before: r.before as AuditEntry["before"],
      after: r.after as AuditEntry["after"],
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}
