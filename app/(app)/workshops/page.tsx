import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { WorkshopsView } from "@/components/workshops/workshops-view";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listLocations } from "@/lib/services/locations";
import { listWorkshops } from "@/lib/services/workshops";
import { workshopFiltersSchema } from "@/lib/validation/workshops";
import { parseUiFilters, toApiParams } from "@/lib/workshop-filters";

export const metadata: Metadata = { title: "Workshops" };

/**
 * Prefetches the first page straight from the service layer (no HTTP hop)
 * under the same query key the client uses, so the table renders with data
 * on first paint and the browser makes zero requests on load.
 */
export default async function WorkshopsPage({ searchParams }: PageProps<"/workshops">) {
  await requirePermission("workshops:read");
  const params = toApiParams(parseUiFilters(await searchParams));
  const qc = getServerQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: qk.workshops.list(params),
      queryFn: () => listWorkshops(workshopFiltersSchema.parse(params)),
    }),
    qc.prefetchQuery({ queryKey: qk.locations, queryFn: listLocations }),
  ]);

  return (
    <HydrationBoundary state={dehydrateServer()}>
      <WorkshopsView />
    </HydrationBoundary>
  );
}
