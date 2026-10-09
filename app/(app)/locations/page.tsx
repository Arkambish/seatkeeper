import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { LocationsView } from "@/components/locations/locations-view";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listLocations } from "@/lib/services/locations";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  await requirePermission("workshops:write");
  await getServerQueryClient().prefetchQuery({ queryKey: qk.locations, queryFn: listLocations });
  return (
    <HydrationBoundary state={dehydrateServer()}>
      <LocationsView />
    </HydrationBoundary>
  );
}
