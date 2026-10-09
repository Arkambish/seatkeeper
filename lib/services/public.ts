import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * Read-only data for the public site. Only workshop facts and seat counts:
 * never attendee names or emails.
 *
 * Cached across visitors ("use cache"), so the public pages never wait on the
 * database. Staff writes call invalidatePublicCatalogue(), and a 60s
 * revalidation is the backstop.
 */
export const PUBLIC_TAG = "public-workshops";

export type PublicWorkshop = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor: string;
  location: { id: string; name: string };
  startsAt: string;
  endsAt: string;
  capacity: number;
  seatsLeft: number;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
};

const select = {
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
  location: { select: { id: true, name: true } },
} as const;

type Row = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  activeCount: number;
  status: PublicWorkshop["status"];
  location: { id: string; name: string };
};

const toPublic = ({ activeCount, startsAt, endsAt, ...w }: Row): PublicWorkshop => ({
  ...w,
  startsAt: startsAt.toISOString(),
  endsAt: endsAt.toISOString(),
  seatsLeft: Math.max(w.capacity - activeCount, 0),
});

/** Upcoming, open workshops plus the locations that host them. */
export async function getPublicCatalogue() {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });

  const [workshops, locations] = await Promise.all([
    prisma.workshop.findMany({
      where: { status: "SCHEDULED", endsAt: { gt: new Date() } },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 60,
      relationLoadStrategy: "join",
      select,
    }),
    prisma.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { workshops: workshops.map(toPublic), locations, generatedAt: new Date().toISOString() };
}

/** One workshop by id (any status, so old links show a clear "cancelled" note). */
export async function getPublicWorkshop(id: string): Promise<PublicWorkshop | null> {
  "use cache";
  cacheTag(PUBLIC_TAG);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });

  const row = await prisma.workshop.findUnique({ where: { id }, relationLoadStrategy: "join", select });
  return row ? toPublic(row) : null;
}
