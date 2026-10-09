import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant placeholder shown while a page's session check and data stream in.
 * Shaped like the real pages (eyebrow, serif title, one surface) so nothing jumps.
 */
export function PageSkeleton({ narrow = false, rows = 5 }: { narrow?: boolean; rows?: number }) {
  return (
    <div className={narrow ? "mx-auto max-w-4xl" : undefined} aria-busy aria-label="Loading">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="mb-10 h-9 w-56" />
      <div className="rounded-xl border border-border bg-white">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border px-5 py-5 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
