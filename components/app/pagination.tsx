"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { PAGE_SIZES } from "@/lib/validation/common";
import { NativeSelect } from "./ui";

/** 1 … 4 5 6 … 12: always first, last, current ±1; gaps collapse to an ellipsis. */
export function pageItems(page: number, totalPages: number): (number | "gap")[] {
  const keep = new Set([1, totalPages, page - 1, page, page + 1]);
  const out: (number | "gap")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (keep.has(p)) out.push(p);
    else if (out.at(-1) !== "gap") out.push("gap");
  }
  return out;
}

export function Pagination({
  page,
  pageSize,
  total,
  noun = "items",
  onPageChange,
  onPageSizeChange,
  onPrefetch,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Plural noun for the summary, e.g. "workshops". */
  noun?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Called on hover/focus of a page button so the next page can be warmed. */
  onPrefetch?: (page: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };
  const btn =
    "press inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}
    >
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        Showing <span className="text-[#111]">{from}</span>–<span className="text-[#111]">{to}</span> of{" "}
        <span className="text-[#111]">{total}</span> {noun}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <NativeSelect
            aria-label="Rows per page"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 sm:text-[13px]"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} per page
              </option>
            ))}
          </NativeSelect>
        )}
        {totalPages > 1 && (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={cn(btn, "text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111]")}
              onClick={() => go(page - 1)}
              onMouseEnter={() => page > 1 && onPrefetch?.(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <CaretLeft size={14} weight="bold" aria-hidden />
            </button>
            {pageItems(page, totalPages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => go(p)}
                  onMouseEnter={() => onPrefetch?.(p)}
                  onFocus={() => onPrefetch?.(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    btn,
                    p === page ? "bg-[#111] text-white" : "text-[#2f3437] hover:bg-[#efeeeb]",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              className={cn(btn, "text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111]")}
              onClick={() => go(page + 1)}
              onMouseEnter={() => page < totalPages && onPrefetch?.(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <CaretRight size={14} weight="bold" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Pagination for lists already in memory (registrations of one workshop,
 * accounts). `resetKey` jumps back to page 1 when the filter/tab changes.
 */
export function useClientPagination<T>(items: T[], resetKey: unknown, initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Back to page 1 whenever the underlying view changes.
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setPage(1);
  }

  // Never sit past the last page (e.g. after a cancellation shrinks the list).
  // Clamped during render, so there's no extra effect pass.
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  return {
    page: current,
    pageSize,
    total: items.length,
    pageItems,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
