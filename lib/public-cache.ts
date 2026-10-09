import "server-only";
import { revalidateTag } from "next/cache";
import { PUBLIC_TAG } from "@/lib/services/public";

/**
 * Called after any staff write that changes what the public sees (seats,
 * schedule, locations). Stale-while-revalidate: the next visitor triggers a
 * background refresh, nobody waits. Outside a Next request (unit tests) there
 * is no cache to invalidate, so this is a no-op there.
 */
export function invalidatePublicCatalogue() {
  try {
    revalidateTag(PUBLIC_TAG, "max");
  } catch {
    // Not running inside Next (e.g. Vitest): nothing to invalidate.
  }
}
