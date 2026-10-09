"use client";

import { useState } from "react";
import { ClockCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/app/empty-state";
import { Pagination } from "@/components/app/pagination";
import { Surface } from "@/components/app/ui";
import { useLocations, useWorkshopHistory } from "@/hooks/queries";
import { ACTION_LABELS, describeChanges } from "@/lib/audit-format";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Audit trail for one workshop: who changed what, and when. Fetched only when opened. */
export function WorkshopHistory({ workshopId }: { workshopId: string }) {
  const [page, setPage] = useState(1);
  const { data, isPending, error, isPlaceholderData } = useWorkshopHistory(workshopId, page);
  const { data: locations = [] } = useLocations();
  const location = (id: string) => locations.find((l) => l.id === id)?.name;

  if (isPending) {
    return (
      <Surface className="space-y-4 p-6">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </Surface>
    );
  }
  if (error) {
    return (
      <Surface>
        <EmptyState size="sm" tone="error" icon={<WarningCircle size={20} weight="bold" />} title="Couldn't load changes" description={error.message} />
      </Surface>
    );
  }
  if (!data.items.length) {
    return (
      <Surface>
        <EmptyState
          size="sm"
          icon={<ClockCounterClockwise size={20} weight="bold" />}
          title="No recorded changes"
          description="Edits to this workshop (dates, capacity, status…) will appear here with who made them."
        />
      </Surface>
    );
  }

  return (
    <>
      <Surface className={cn("transition-opacity duration-200", isPlaceholderData && "opacity-60")}>
        <ol className="divide-y divide-border">
          {data.items.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:gap-8">
              <div className="shrink-0 sm:w-56">
                <div className="text-sm text-[#111]">
                  {e.actor.name} <span className="text-muted-foreground">{ACTION_LABELS[e.action] ?? e.action}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</div>
              </div>
              {e.action !== "workshop.create" && (
                <ul className="flex flex-col gap-1 text-sm">
                  {describeChanges(e, { location }).map((c) => (
                    <li key={c.field}>
                      <span className="text-muted-foreground">{c.field}:</span>{" "}
                      {c.from !== null && <span className="text-muted-foreground line-through decoration-[#c9c8c4]">{c.from}</span>}
                      {c.from !== null && " → "}
                      <span className="text-[#111]">{c.to}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Surface>
      <Pagination className="mt-4" page={page} pageSize={data.pageSize} total={data.total} noun="changes" onPageChange={setPage} />
    </>
  );
}
