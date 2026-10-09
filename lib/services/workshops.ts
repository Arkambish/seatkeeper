import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, isUniqueViolation } from "@/lib/errors";
import type { Paged, Workshop, WorkshopDetail } from "@/lib/types";
import type {
  CreateWorkshopInput,
  UpdateWorkshopInput,
  WorkshopFilters,
} from "@/lib/validation/workshops";
import { diff, recordAudit } from "./audit";
import { paginate } from "./paging";
import { rebalanceSeats } from "./seats";

// Only the columns the UI renders; `location` is fetched in the same SQL query.
const workshopSelect = {
  id: true,
  code: true,
  title: true,
  description: true,
  instructor: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  activeCount: true,
  status: true,
  updatedAt: true,
  location: { select: { id: true, name: true } },
} satisfies Prisma.WorkshopSelect;

type WorkshopRow = Prisma.WorkshopGetPayload<{ select: typeof workshopSelect }>;

function toWorkshop(w: WorkshopRow): Workshop {
  return {
    ...w,
    startsAt: w.startsAt.toISOString(),
    endsAt: w.endsAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    seatsLeft: Math.max(w.capacity - w.activeCount, 0),
  };
}

export async function listWorkshops(f: WorkshopFilters): Promise<Paged<Workshop>> {
  const and: Prisma.WorkshopWhereInput[] = [];

  if (f.from) and.push({ startsAt: { gte: new Date(f.from) } });
  if (f.to) and.push({ startsAt: { lt: new Date(f.to) } });
  if (!f.from && !f.to && !f.includePast) and.push({ endsAt: { gte: new Date() } });
  if (f.status) and.push({ status: f.status });
  if (f.locationId) and.push({ locationId: f.locationId });
  // Column-to-column comparison: cheap thanks to the denormalised counter.
  if (f.hasSeats) {
    and.push({ status: "SCHEDULED", activeCount: { lt: prisma.workshop.fields.capacity } });
  }
  if (f.q) {
    and.push({
      OR: [
        { code: { contains: f.q, mode: "insensitive" } },
        { title: { contains: f.q, mode: "insensitive" } },
        { instructor: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  const where = { AND: and };
  return paginate(
    f.page,
    f.pageSize,
    async ({ skip, take }) =>
      (
        await prisma.workshop.findMany({
          where,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          skip,
          take,
          relationLoadStrategy: "join",
          select: workshopSelect,
        })
      ).map(toWorkshop),
    () => prisma.workshop.count({ where }),
  );
}

export async function getWorkshop(id: string): Promise<WorkshopDetail> {
  const w = await prisma.workshop.findUnique({
    where: { id },
    relationLoadStrategy: "join",
    select: {
      ...workshopSelect,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
      _count: { select: { registrations: { where: { status: "WAITLISTED" } } } },
    },
  });
  if (!w) throw new AppError("NOT_FOUND", "Workshop not found.");
  const { _count, createdAt, createdBy, updatedBy, ...rest } = w;
  return {
    ...toWorkshop(rest),
    waitlistCount: _count.registrations,
    createdBy,
    updatedBy,
    createdAt: createdAt.toISOString(),
  };
}

export async function createWorkshop(input: CreateWorkshopInput, actorId: string) {
  const id = randomUUID();
  const data = {
    ...input,
    id,
    description: input.description ?? null,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt),
    createdById: actorId,
    updatedById: actorId,
  };
  try {
    // Batch transaction: the workshop and its audit entry commit together.
    await prisma.$transaction([
      prisma.workshop.create({ data }),
      prisma.auditLog.create({
        data: {
          actorId,
          action: "workshop.create",
          entityType: "workshop",
          entityId: id,
          after: { ...input } as Prisma.InputJsonValue,
        },
      }),
    ]);
  } catch (e) {
    throw mapWriteError(e);
  }
  return getWorkshop(id);
}

/**
 * Locks the workshop row so no registration can slip in between the capacity
 * check and the update. Raising capacity (or re-opening a workshop) promotes
 * people from the waitlist in the same transaction.
 */
export async function updateWorkshop(id: string, input: UpdateWorkshopInput, actorId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM workshops WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked.length) throw new AppError("NOT_FOUND", "Workshop not found.");

      const before = await tx.workshop.findUniqueOrThrow({ where: { id } });
      if (input.capacity !== undefined && input.capacity < before.activeCount) {
        throw new AppError(
          "CAPACITY_BELOW_REGISTERED",
          `${before.activeCount} people are registered, so capacity can't go below ${before.activeCount}.`,
          { capacity: [`Must be at least ${before.activeCount}`] },
        );
      }

      const { startsAt, endsAt, ...rest } = input;
      const data = {
        ...rest,
        ...(startsAt && { startsAt: new Date(startsAt) }),
        ...(endsAt && { endsAt: new Date(endsAt) }),
      };
      if ((data.endsAt ?? before.endsAt) <= (data.startsAt ?? before.startsAt)) {
        throw new AppError("VALIDATION_FAILED", "End must be after start.", {
          endsAt: ["End must be after start"],
        });
      }

      const changes = diff(before, data);
      if (!changes) return;

      await tx.workshop.update({ where: { id }, data: { ...data, updatedById: actorId } });
      await recordAudit(tx, {
        actorId,
        action: "workshop.update",
        entityType: "workshop",
        entityId: id,
        ...changes,
      });
      await rebalanceSeats(tx, id, 0);
    });
  } catch (e) {
    throw mapWriteError(e);
  }
  return getWorkshop(id);
}


/**
 * Hard delete, allowed only for a workshop that never had a registration
 * (e.g. created by mistake). Once anyone has booked, the records must be kept
 * (spec: "the record is never deleted"), so the caller is told to cancel the
 * workshop instead. The audit entry keeps a full snapshot of what was deleted.
 */
export async function deleteWorkshop(id: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM workshops WHERE id = ${id}::uuid FOR UPDATE`;
    if (!locked) throw new AppError("NOT_FOUND", "Workshop not found.");

    const [before, registrations] = await Promise.all([
      tx.workshop.findUniqueOrThrow({ where: { id } }),
      tx.registration.count({ where: { workshopId: id } }),
    ]);
    if (registrations > 0) {
      throw new AppError(
        "WORKSHOP_HAS_REGISTRATIONS",
        `${before.code} has ${registrations} registration record${registrations === 1 ? "" : "s"}, which must be kept. Cancel the workshop instead.`,
      );
    }
    await tx.workshop.delete({ where: { id } });
    await recordAudit(tx, {
      actorId,
      action: "workshop.delete",
      entityType: "workshop",
      entityId: id,
      before: JSON.parse(JSON.stringify(before)) as Record<string, unknown>,
    });
  });
}

function mapWriteError(e: unknown) {
  if (e instanceof AppError) return e;
  if (isUniqueViolation(e)) {
    return new AppError("DUPLICATE", "A workshop with this code already exists.", {
      code: ["This code is already in use"],
    });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
    return new AppError("VALIDATION_FAILED", "Unknown location.", { locationId: ["Unknown location"] });
  }
  return e;
}
