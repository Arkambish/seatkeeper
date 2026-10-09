"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Armchair, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/components/app/me-context";
import { EmptyState, NativeSelect, PageHeader, SeatMeter, SeatsPill, StatusPill, Surface } from "@/components/app/ui";
import { useLocations, usePrefetchWorkshop, useWorkshops } from "@/hooks/queries";
import { formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { parseUiFilters, toApiParams, toSearchParams, type Range, type UiFilters } from "@/lib/workshop-filters";
import type { Workshop } from "@/lib/types";

const RANGE_LABELS: [Range, string][] = [
  ["upcoming", "Upcoming"],
  ["this-week", "This week"],
  ["next-7-days", "Next 7 days"],
  ["all", "All dates"],
  ["custom", "Custom"],
];

/**
 * Filters live in the URL. Updating them uses history.replaceState, which
 * Next keeps in sync with useSearchParams, so changing a filter is a client
 * fetch only and never a server re-render.
 */
function useUrlFilters() {
  const sp = useSearchParams();
  const filters = useMemo(() => parseUiFilters(new URLSearchParams(sp.toString())), [sp]);
  const update = (patch: Partial<UiFilters>) => {
    const qs = toSearchParams({ ...filters, ...patch }).toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };
  return [filters, update] as const;
}

export function WorkshopsView() {
  const [filters, update] = useUrlFilters();
  const params = useMemo(() => toApiParams(filters), [filters]);
  const { data, isPending, isFetching, isPlaceholderData, hasNextPage, fetchNextPage, isFetchingNextPage, error } =
    useWorkshops(params);
  const { data: locations = [] } = useLocations();
  const canWrite = useCan("workshops:write");

  // Debounced search: type freely, fetch once you pause.
  const [q, setQ] = useState(filters.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== q.trim()) update({ q: q.trim() || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const rows = data?.pages.flatMap((p) => p.items) ?? [];
  const isQuickView =
    filters.range === "this-week" && filters.hasSeats && !filters.status && !filters.locationId && !filters.q;
  const hasFilters =
    filters.range !== "upcoming" || filters.hasSeats || !!filters.status || !!filters.locationId || !!filters.q;
  const clearFilters = () => {
    setQ("");
    update({ range: "upcoming", hasSeats: false, status: undefined, locationId: undefined, q: undefined, from: undefined, to: undefined });
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Catalogue"
        title="Workshops"
        description="Find a workshop by date, status or free seats, then open it to register attendees."
        actions={
          canWrite && (
            <Link href="/workshops/new" className={buttonVariants()}>
              <Plus weight="bold" /> New workshop
            </Link>
          )
        }
      />

      {/* The front desk's most common question, one click away. */}
      <button
        type="button"
        onClick={() => {
          setQ("");
          update({ range: "this-week", hasSeats: true, status: undefined, locationId: undefined, q: undefined, from: undefined, to: undefined });
        }}
        aria-pressed={isQuickView}
        className={cn(
          "press mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
          isQuickView
            ? "border-[var(--pastel-green-fg)]/30 bg-[var(--pastel-green)] text-[var(--pastel-green-fg)]"
            : "border-[#e3e2df] bg-white text-[#2f3437] hover:border-[#d6d5d1]",
        )}
      >
        <Armchair size={15} weight="bold" aria-hidden />
        This week, with free seats
      </button>

      {/* Date range */}
      <div className="mb-4 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Date range">
        {RANGE_LABELS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filters.range === value}
            onClick={() => update({ range: value })}
            className={cn(
              "press h-8 rounded-md px-3 text-sm",
              filters.range === value
                ? "bg-[#111] text-white"
                : "text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111]",
            )}
          >
            {label}
          </button>
        ))}
        {filters.range === "custom" && (
          <div className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Input type="date" aria-label="From date" className="h-8 w-auto bg-white" value={filters.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} />
            <span>to</span>
            <Input type="date" aria-label="To date" className="h-8 w-auto bg-white" value={filters.to ?? ""} min={filters.from} onChange={(e) => update({ to: e.target.value || undefined })} />
          </div>
        )}
      </div>

      {/* Other filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search code, title or instructor"
            aria-label="Search workshops"
            className="h-9 bg-white pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <NativeSelect aria-label="Status" value={filters.status ?? ""} onChange={(e) => update({ status: (e.target.value || undefined) as UiFilters["status"] })}>
          <option value="">Any status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </NativeSelect>
        <NativeSelect aria-label="Location" value={filters.locationId ?? ""} onChange={(e) => update({ locationId: e.target.value || undefined })}>
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 text-sm">
          <Switch checked={filters.hasSeats} onCheckedChange={(v) => update({ hasSeats: v })} aria-label="Only workshops with free seats" />
          Has free seats
        </label>
        <span aria-live="polite" className={cn("ml-auto font-mono text-xs text-muted-foreground transition-opacity", isFetching && !isFetchingNextPage ? "opacity-100" : "opacity-0")}>
          Updating…
        </span>
      </div>

      <Surface className={cn("overflow-hidden transition-opacity duration-200", isPlaceholderData && "opacity-60")}>
        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState title="Couldn't load workshops">{error.message}</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState title="No workshops match">
            <p>Try a wider date range, or start again from all upcoming workshops.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </EmptyState>
        ) : (
          <WorkshopTable rows={rows} />
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

function WorkshopTable({ rows }: { rows: Workshop[] }) {
  const prefetch = usePrefetchWorkshop();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            <th className="px-5 py-3 font-normal">When</th>
            <th className="px-5 py-3 font-normal">Workshop</th>
            <th className="px-5 py-3 font-normal">Location</th>
            <th className="w-52 px-5 py-3 font-normal">Seats</th>
            <th className="px-5 py-3 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr
              key={w.id}
              className="group relative border-b border-border transition-colors last:border-0 hover:bg-[#fbfbfa] has-[a:focus-visible]:bg-[#fbfbfa] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-[#111]"
              onMouseEnter={() => prefetch(w.id)}
              onFocus={() => prefetch(w.id)}
            >
              <td className="px-5 py-4 align-top whitespace-nowrap">
                <div className="text-[#111]">{formatDate(w.startsAt)}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {formatTime(w.startsAt)}–{formatTime(w.endsAt)}
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                {/* The whole row is clickable through this stretched link. */}
                <Link href={`/workshops/${w.id}`} className="font-medium text-[#111] after:absolute after:inset-0 focus-visible:outline-none">
                  {w.title}
                </Link>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{w.code}</span> · {w.instructor}
                </div>
              </td>
              <td className="px-5 py-4 align-top text-[#2f3437]">{w.location.name}</td>
              <td className="px-5 py-4 align-top">
                <div className="flex flex-col items-start gap-2">
                  <SeatsPill seatsLeft={w.seatsLeft} capacity={w.capacity} status={w.status} />
                  {w.status === "SCHEDULED" && <SeatMeter used={w.activeCount} capacity={w.capacity} />}
                </div>
              </td>
              <td className="px-5 py-4 align-top">
                <StatusPill status={w.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}
