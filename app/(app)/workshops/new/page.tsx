import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/ui";
import { WorkshopForm } from "@/components/workshops/workshop-form";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listLocations } from "@/lib/services/locations";
import { getWorkshop } from "@/lib/services/workshops";
import { uuid } from "@/lib/validation/common";

export const metadata: Metadata = { title: "New workshop" };

export default async function NewWorkshopPage({ searchParams }: PageProps<"/workshops/new">) {
  await requirePermission("workshops:write");
  const { from } = await searchParams;
  const fromId = typeof from === "string" && uuid.safeParse(from).success ? from : undefined;

  // "Duplicate" opens this page with ?from=<id>: prefill from that workshop.
  const [template] = await Promise.all([
    fromId ? getWorkshop(fromId).catch(() => undefined) : undefined,
    getServerQueryClient().prefetchQuery({ queryKey: qk.locations, queryFn: listLocations }),
  ]);

  return (
    <HydrationBoundary state={dehydrateServer()}>
      <div className="fade-in mx-auto max-w-4xl">
        <PageHeader
          eyebrow={template ? `Copy of ${template.code}` : "Catalogue"}
          title={template ? "Duplicate workshop" : "New workshop"}
          description={template ? "Same details, one week later. Give it a new code and check the dates." : undefined}
        />
        <WorkshopForm template={template} />
      </div>
    </HydrationBoundary>
  );
}
