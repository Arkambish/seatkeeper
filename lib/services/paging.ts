import type { Paged } from "@/lib/types";

/**
 * Offset pagination with a total, so staff get page numbers and "1–10 of 23".
 * The count runs in parallel with the page query (one round trip of latency),
 * and both use the same indexed WHERE. At this catalogue's size (hundreds of
 * rows, not millions) offset is cheap; keyset would only matter far deeper.
 */
export async function paginate<T>(
  page: number,
  pageSize: number,
  fetch: (args: { skip: number; take: number }) => Promise<T[]>,
  count: () => Promise<number>,
): Promise<Paged<T>> {
  const [items, total] = await Promise.all([fetch({ skip: (page - 1) * pageSize, take: pageSize }), count()]);
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
