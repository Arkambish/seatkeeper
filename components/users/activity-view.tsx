"use client";

import { useEffect, useState } from "react";
import { ClockCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/app/empty-state";
import { Pagination } from "@/components/app/pagination";
import { PageHeader, Surface } from "@/components/app/ui";
import { accountHistoryQuery, useAccountHistory, useUsers } from "@/hooks/queries";
import { ACTION_LABELS, describeChanges } from "@/lib/audit-format";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

/** Audit trail of account and role changes: who did what, to whom, and when. */
export function ActivityView() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, error, isPlaceholderData } = useAccountHistory(page, pageSize);
  const { data: users = [] } = useUsers();
  const qc = useQueryClient();
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "a removed account";
  const entries = data?.items ?? [];

  // Warm the next page so paging feels instant.
  useEffect(() => {
    if (data && page < data.totalPages) void qc.prefetchQuery(accountHistoryQuery(page + 1, pageSize));
  }, [data, page, pageSize, qc]);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Activity"
        description="Every account change: creations, role changes, deactivations and password resets."
      />
      <Surface className={cn("transition-opacity duration-200", isPlaceholderData && "opacity-60")}>
        {error ? (
          <EmptyState tone="error" icon={<WarningCircle size={22} weight="bold" />} title="Couldn't load activity" description={error.message} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<ClockCounterClockwise size={22} weight="bold" />}
            title="Nothing has changed yet"
            description="New accounts, role changes, deactivations and password resets will be listed here as they happen."
          />
        ) : (
          <ol className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:gap-8">
                <div className="shrink-0 sm:w-64">
                  <div className="text-sm text-[#111]">
                    {e.actor.name} <span className="text-muted-foreground">{ACTION_LABELS[e.action] ?? e.action}</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</div>
                </div>
                <div className="text-sm">
                  <div className="text-[#111]">{nameOf(e.entityId)}</div>
                  {!["user.create", "user.password_reset", "user.password_change"].includes(e.action) && (
                    <ul className="mt-0.5 flex flex-col gap-0.5">
                      {describeChanges(e).map((c) => (
                        <li key={c.field} className="text-muted-foreground">
                          {c.field}: {c.from !== null && <span className="line-through decoration-[#c9c8c4]">{c.from}</span>}
                          {c.from !== null && " → "}
                          <span className="text-[#111]">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Surface>
      {data && (
        <Pagination
          className="mt-5"
          page={page}
          pageSize={pageSize}
          total={data.total}
          noun={data.total === 1 ? "change" : "changes"}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          onPrefetch={(p) => void qc.prefetchQuery(accountHistoryQuery(p, pageSize))}
        />
      )}
    </div>
  );
}
