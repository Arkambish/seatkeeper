import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { ActivityView } from "@/components/users/activity-view";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listAudit } from "@/lib/services/audit";
import { listUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  await requirePermission("users:manage");
  const qc = getServerQueryClient();
  await Promise.all([
    qc.prefetchInfiniteQuery({
      queryKey: qk.users.history,
      queryFn: () => listAudit({ entityType: "user" }),
      initialPageParam: undefined as string | undefined,
    }),
    qc.prefetchQuery({ queryKey: qk.users.all, queryFn: listUsers }),
  ]);
  return (
    <HydrationBoundary state={dehydrateServer()}>
      <ActivityView />
    </HydrationBoundary>
  );
}
