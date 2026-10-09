import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { AppError, isUniqueViolation } from "@/lib/errors";
import type { Location } from "@/lib/types";
import type { LocationInput } from "@/lib/validation/locations";
import { recordAudit } from "./audit";

/** All locations with how many workshops use each (one grouped query). */
export async function listLocations(): Promise<Location[]> {
  const rows = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { workshops: true } } },
  });
  return rows.map(({ _count, ...l }) => ({ ...l, workshopCount: _count.workshops }));
}

const duplicate = () =>
  new AppError("DUPLICATE", "A location with this name already exists.", { name: ["Name already in use"] });

export async function createLocation(input: LocationInput, actorId: string): Promise<Location> {
  const id = randomUUID();
  try {
    const [location] = await prisma.$transaction([
      prisma.location.create({ data: { id, name: input.name }, select: { id: true, name: true } }),
      prisma.auditLog.create({
        data: { actorId, action: "location.create", entityType: "location", entityId: id, after: { name: input.name } },
      }),
    ]);
    return { ...location, workshopCount: 0 };
  } catch (e) {
    if (isUniqueViolation(e)) throw duplicate();
    throw e;
  }
}

export async function renameLocation(id: string, input: LocationInput, actorId: string): Promise<Location> {
  try {
    return await prisma.$transaction(async (tx) => {
      const before = await tx.location.findUnique({ where: { id } });
      if (!before) throw new AppError("NOT_FOUND", "Location not found.");
      const after = await tx.location.update({
        where: { id },
        data: { name: input.name },
        select: { id: true, name: true, _count: { select: { workshops: true } } },
      });
      if (before.name !== after.name) {
        await recordAudit(tx, {
          actorId,
          action: "location.update",
          entityType: "location",
          entityId: id,
          before: { name: before.name },
          after: { name: after.name },
        });
      }
      const { _count, ...l } = after;
      return { ...l, workshopCount: _count.workshops };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw duplicate();
    throw e;
  }
}

/** Only an unused location can be deleted; workshops keep their history. */
export async function deleteLocation(id: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    const loc = await tx.location.findUnique({
      where: { id },
      select: { name: true, _count: { select: { workshops: true } } },
    });
    if (!loc) throw new AppError("NOT_FOUND", "Location not found.");
    if (loc._count.workshops > 0) {
      throw new AppError(
        "LOCATION_IN_USE",
        `${loc.name} is used by ${loc._count.workshops} workshop${loc._count.workshops === 1 ? "" : "s"}, so it can't be deleted. Rename it instead.`,
      );
    }
    await tx.location.delete({ where: { id } });
    await recordAudit(tx, {
      actorId,
      action: "location.delete",
      entityType: "location",
      entityId: id,
      before: { name: loc.name },
    });
  });
}
