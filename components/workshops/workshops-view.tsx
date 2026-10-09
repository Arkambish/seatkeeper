"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  CalendarBlank,
  MagnifyingGlass,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/components/app/me-context";
import { EmptyState } from "@/components/app/empty-state";
import { Pagination } from "@/components/app/pagination";
import {
  NativeSelect,
  PageHeader,
  SeatMeter,
  SeatsPill,
  StatusPill,
  Surface,
} from "@/components/app/ui";
import {
  useLocations,
  usePrefetchWorkshop,
  usePrefetchWorkshopsPage,
  useWorkshops,
} from "@/hooks/queries";
import { WorkshopActions } from "./workshop-actions";
import { formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  parseUiFilters,
  toApiParams,
  toSearchParams,
  type Range,
  type UiFilters,
} from "@/lib/workshop-filters";
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
  const filters = useMemo(
    () => parseUiFilters(new URLSearchParams(sp.toString())),
    [sp],
  );
  const update = (patch: Partial<UiFilters>) => {
    // Any change other than moving between pages starts again from page 1.
    const onlyPaging = Object.keys(patch).every((k) => k === "page");
    const qs = toSearchParams({
      ...filters,
      ...(onlyPaging ? {} : { page: 1 }),
      ...patch,
    }).toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  };
  return [filters, update] as const;
}

export function WorkshopsView() {
  const [filters, update] = useUrlFilters();
  const params = useMemo(() => toApiParams(filters), [filters]);
  const { data, isPending, isFetching, isPlaceholderData, error } =
    useWorkshops(params);
  const prefetchPage = usePrefetchWorkshopsPage();
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

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Warm the next page as soon as this one lands, so "Next" is instant.
  useEffect(() => {
    if (data && filters.page < data.totalPages)
      prefetchPage(toApiParams({ ...filters, page: filters.page + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters]);

  // Deleting the last row of the last page: step back a page.
  useEffect(() => {
    if (data && !isPlaceholderData && filters.page > totalPages)
      update({ page: totalPages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, totalPages]);
  const isQuickView =
    filters.range === "this-week" &&
    filters.hasSeats &&
    !filters.status &&
    !filters.locationId &&
    !filters.q;
  const hasFilters =
    filters.range !== "upcoming" ||
    filters.hasSeats ||
    !!filters.status ||
    !!filters.locationId ||
    !!filters.q;
  const clearFilters = () => {
    setQ("");
    update({
      range: "upcoming",
      hasSeats: false,
      status: undefined,
      locationId: undefined,
      q: undefined,
      from: undefined,
      to: undefined,
    });
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
          update({
            range: "this-week",
            hasSeats: true,
            status: undefined,
            locationId: undefined,
            q: undefined,
            from: undefined,
            to: undefined,
          });
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
      <div
        className="scroll-strip -mx-4 mb-4 flex items-center gap-1 px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        role="radiogroup"
        aria-label="Date range"
      >
        {RANGE_LABELS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filters.range === value}
            onClick={() => update({ range: value })}
            className={cn(
              "press h-8 shrink-0 rounded-md px-3 text-sm whitespace-nowrap",
              filters.range === value
                ? "bg-[#111] text-white"
                : "text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111]",
            )}
          >
            {label}
          </button>
        ))}
        {filters.range === "custom" && (
          <div className="ml-2 flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <Input
              type="date"
              aria-label="From date"
              className="h-8 w-auto bg-white"
              value={filters.from ?? ""}
              onChange={(e) => update({ from: e.target.value || undefined })}
            />
            <span>to</span>
            <Input
              type="date"
              aria-label="To date"
              className="h-8 w-auto bg-white"
              value={filters.to ?? ""}
              min={filters.from}
              onChange={(e) => update({ to: e.target.value || undefined })}
            />
          </div>
        )}
      </div>

      {/* Other filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={15}
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder="Search code, title or instructor"
            aria-label="Search workshops"
            className="h-9 bg-white pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <NativeSelect
          aria-label="Status"
          value={filters.status ?? ""}
          onChange={(e) =>
            update({
              status: (e.target.value || undefined) as UiFilters["status"],
            })
          }
        >
          <option value="">Any status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Location"
          value={filters.locationId ?? ""}
          onChange={(e) => update({ locationId: e.target.value || undefined })}
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 text-sm">
          <Switch
            checked={filters.hasSeats}
            onCheckedChange={(v) => update({ hasSeats: v })}
            aria-label="Only workshops with free seats"
          />
          Has free seats
        </label>
        <span
          aria-live="polite"
          className={cn(
            "ml-auto font-mono text-xs text-muted-foreground transition-opacity",
            isFetching && !isPending ? "opacity-100" : "opacity-0",
          )}
        >
          Updating…
        </span>
      </div>

      <Surface
        className={cn(
          "overflow-hidden transition-opacity duration-200",
          isPlaceholderData && "opacity-60",
        )}
      >
        {isPending ? (
          <TableSkeleton />
        ) : error ? (
          <EmptyState
            tone="error"
            icon={<WarningCircle size={22} weight="bold" />}
            title="Couldn't load workshops"
            description={error.message}
          />
        ) : rows.length === 0 && hasFilters ? (
          <EmptyState
            icon={<MagnifyingGlass size={22} weight="bold" />}
            title="No workshops match"
            description="Try a wider date range or fewer filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CalendarBlank size={22} weight="bold" />}
            title="No upcoming workshops"
            description={
              canWrite
                ? "Schedule the first one and it will appear here."
                : "Nothing is scheduled yet."
            }
            action={
              canWrite && (
                <Link href="/workshops/new" className={buttonVariants()}>
                  <Plus weight="bold" /> New workshop
                </Link>
              )
            }
          />
        ) : (
          <WorkshopTable rows={rows} showActions={canWrite} />
        )}
      </Surface>

      {data && (
        <Pagination
          className="mt-5"
          page={filters.page}
          pageSize={filters.pageSize}
          total={data.total}
          noun={data.total === 1 ? "workshop" : "workshops"}
          onPageChange={(page) => {
            update({ page });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onPageSizeChange={(pageSize) => update({ pageSize })}
          onPrefetch={(page) => prefetchPage(toApiParams({ ...filters, page }))}
        />
      )}
    </div>
  );
}

function WorkshopTable({
  rows,
  showActions,
}: {
  rows: Workshop[];
  showActions: boolean;
}) {
  const prefetch = usePrefetchWorkshop();
  return (
    <>
      {/* Phones: one stacked card per workshop, everything readable without sideways scrolling. */}
      <ul className="divide-y divide-border md:hidden">
        {rows.map((w) => (
          <li
            key={w.id}
            className="relative px-4 py-4 active:bg-[#fbfbfa] has-[a:focus-visible]:bg-[#fbfbfa]"
            onTouchStart={() => prefetch(w.id)}
            onFocus={() => prefetch(w.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">
                  {formatDate(w.startsAt)} · {formatTime(w.startsAt)}–
                  {formatTime(w.endsAt)}
                </p>
                <Link
                  href={`/workshops/${w.id}`}
                  className="mt-1 block text-[15px] font-medium text-[#111] after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {w.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-mono">{w.code}</span> · {w.instructor} ·{" "}
                  {w.location.name}
                </p>
              </div>
              {showActions && (
                <div className="-mt-1 -mr-1 shrink-0">
                  <WorkshopActions workshop={w} />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {w.status === "SCHEDULED" && (
                <SeatsPill
                  seatsLeft={w.seatsLeft}
                  capacity={w.capacity}
                  status={w.status}
                />
              )}
              <StatusPill status={w.status} />
            </div>
            {w.status === "SCHEDULED" && (
              <div className="mt-2.5">
                <SeatMeter used={w.activeCount} capacity={w.capacity} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
              <th className="px-5 py-3 font-normal">When</th>
              <th className="px-5 py-3 font-normal">Workshop</th>
              <th className="px-5 py-3 font-normal">Location</th>
              <th className="w-52 px-5 py-3 font-normal">Seats</th>
              <th className="px-5 py-3 font-normal">Status</th>
              {showActions && (
                <th className="w-14 px-3 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
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
                  <Link
                    href={`/workshops/${w.id}`}
                    className="font-medium text-[#111] after:absolute after:inset-0 focus-visible:outline-none"
                  >
                    {w.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{w.code}</span> · {w.instructor}
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-[#2f3437]">
                  {w.location.name}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col items-start gap-2">
                    <SeatsPill
                      seatsLeft={w.seatsLeft}
                      capacity={w.capacity}
                      status={w.status}
                    />
                    {w.status === "SCHEDULED" && (
                      <SeatMeter used={w.activeCount} capacity={w.capacity} />
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusPill status={w.status} />
                </td>
                {showActions && (
                  <td className="px-3 py-3 text-right align-top">
                    <WorkshopActions workshop={w} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
