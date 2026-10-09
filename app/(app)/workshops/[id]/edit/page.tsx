import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/ui";
import { WorkshopForm } from "@/components/workshops/workshop-form";
import { requirePermission } from "@/lib/auth/guard";
import { AppError } from "@/lib/errors";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { getWorkshop, listLocations } from "@/lib/services/workshops";
import { uuid } from "@/lib/validation/common";

export const metadata: Metadata = { title: "Edit workshop" };

export default async function EditWorkshopPage({ params }: PageProps<"/workshops/[id]/edit">) {
  await requirePermission("workshops:write");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const qc = getServerQueryClient();
  const [workshop] = await Promise.all([
    getWorkshop(id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") return null;
      throw e;
    }),
    qc.prefetchQuery({ queryKey: qk.locations, queryFn: listLocations }),
  ]);
  if (!workshop) notFound();

  return (
    <HydrationBoundary state={dehydrateServer()}>
      <div className="fade-in mx-auto max-w-4xl">
        <PageHeader eyebrow={workshop.code} title="Edit workshop" />
        <WorkshopForm workshop={workshop} />
      </div>
    </HydrationBoundary>
  );
}
