import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/ui";
import { WorkshopForm } from "@/components/workshops/workshop-form";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listLocations } from "@/lib/services/workshops";

export const metadata: Metadata = { title: "New workshop" };

export default async function NewWorkshopPage() {
  await requirePermission("workshops:write");
  await getServerQueryClient().prefetchQuery({ queryKey: qk.locations, queryFn: listLocations });

  return (
    <HydrationBoundary state={dehydrateServer()}>
      <div className="fade-in mx-auto max-w-4xl">
        <PageHeader eyebrow="Catalogue" title="New workshop" />
        <WorkshopForm />
      </div>
    </HydrationBoundary>
  );
}
