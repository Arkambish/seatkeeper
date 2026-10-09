import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { UsersView } from "@/components/users/users-view";
import { requirePermission } from "@/lib/auth/guard";
import { qk } from "@/lib/query/keys";
import { dehydrateServer, getServerQueryClient } from "@/lib/query/server";
import { listUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Accounts" };

export default async function UsersPage() {
  await requirePermission("users:manage");
  await getServerQueryClient().prefetchQuery({ queryKey: qk.users.all, queryFn: listUsers });
  return (
    <HydrationBoundary state={dehydrateServer()}>
      <UsersView />
    </HydrationBoundary>
  );
}
