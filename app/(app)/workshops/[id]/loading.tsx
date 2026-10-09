import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-3 h-3 w-32" />
      <Skeleton className="mb-10 h-9 w-80" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40 rounded-xl md:col-span-2" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-64 rounded-xl" />
    </div>
  );
}
