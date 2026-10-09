import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { WorkshopDetailView } from "@/components/workshops/workshop-detail";
import { requirePermission } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listRegistrations } from "@/lib/services/registrations";
import { listLocations } from "@/lib/services/locations";
import { getWorkshop } from "@/lib/services/workshops";
import { uuid } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Workshop" };

export default async function WorkshopPage({ params }: PageProps<"/workshops/[id]">) {
  await requirePermission("workshops:read");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const qc = getServerQueryClient();
  // Detail and registrations load in parallel. Neither waits for the other.
  const [workshop] = await Promise.all([
    getWorkshop(id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") return null;
      throw e;
    }),
    qc.prefetchQuery({ queryKey: qk.workshops.registrations(id), queryFn: () => listRegistrations(id) }),
    qc.prefetchQuery({ queryKey: qk.locations, queryFn: listLocations }),
  ]);
  if (!workshop) notFound();
  qc.setQueryData(qk.workshops.detail(id), workshop);

  return (
    <HydrationBoundary state={dehydrateServer()}>
      <WorkshopDetailView id={id} />
    </HydrationBoundary>
  );
}
