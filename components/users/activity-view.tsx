"use client";

import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Surface } from "@/components/app/ui";
import { useAccountHistory, useUsers } from "@/hooks/queries";
import { ACTION_LABELS, describeChanges } from "@/lib/audit-format";
import { formatDateTime } from "@/lib/time";

/** Audit trail of account and role changes: who did what, to whom, and when. */
export function ActivityView() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useAccountHistory();
  const { data: users = [] } = useUsers();
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "a deleted account";
  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Activity"
        description="Every account change: creations, role changes, deactivations and password resets."
      />
      <Surface>
        {entries.length === 0 ? (
          <EmptyState title="Nothing yet">Account changes will be listed here as they happen.</EmptyState>
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
                  {e.action !== "user.create" && e.action !== "user.password_reset" && (
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
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
