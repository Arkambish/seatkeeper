"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/app/empty-state";
import { NativeSelect } from "@/components/app/ui";
import { CATEGORIES, categoryOf, type CategoryKey } from "@/lib/catalogue";
import type { PublicWorkshop } from "@/lib/services/public";
import { cn } from "@/lib/utils";
import { WorkshopCard } from "./workshop-card";

const INITIAL = 9;

// Bento shapes keyed by how many categories have workshops, so the grid
// always has exactly as many cells as tiles (no empty cells).
const SPANS: Record<number, string[]> = {
  1: ["md:col-span-4 md:row-span-2"],
  2: ["md:col-span-2 md:row-span-2", "md:col-span-2 md:row-span-2"],
  3: ["md:col-span-2 md:row-span-2", "md:col-span-2", "md:col-span-2"],
  4: ["md:col-span-2 md:row-span-2", "md:col-span-2", "md:col-span-1", "md:col-span-1"],
};

/**
 * Category tiles + filters + the workshop grid. All filtering happens in the
 * browser over data the server already rendered, so it's instant.
 */
export function CatalogueExplorer({
  workshops,
  locations,
}: {
  workshops: PublicWorkshop[];
  locations: { id: string; name: string }[];
}) {
  const [category, setCategory] = useState<CategoryKey | "all">("all");
  const [locationId, setLocationId] = useState("");
  const [seatsOnly, setSeatsOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, count: workshops.filter((w) => categoryOf(w.code).key === c.key).length })).filter(
        (c) => c.count > 0,
      ),
    [workshops],
  );

  const filtered = workshops.filter(
    (w) =>
      (category === "all" || categoryOf(w.code).key === category) &&
      (!locationId || w.location.id === locationId) &&
      (!seatsOnly || w.seatsLeft > 0),
  );
  const visible = showAll ? filtered : filtered.slice(0, INITIAL);
  const filtersActive = category !== "all" || !!locationId || seatsOnly;

  const pickCategory = (key: CategoryKey) => {
    setCategory(key);
    setShowAll(false);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const reset = () => {
    setCategory("all");
    setLocationId("");
    setSeatsOnly(false);
  };

  return (
    <>
      {/* What we teach */}
      {categories.length > 0 && (
        <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
          <h2 id="categories-title" className="font-display max-w-xl text-[2.25rem] leading-[1.1] text-[#111] md:text-[2.75rem]">
            Find your craft
          </h2>
          <p className="mt-4 max-w-[60ch] text-[#787774]">
            Pick a craft to see what&apos;s coming up. Every class is small, hands-on and suitable for beginners.
          </p>
          <div className="mt-10 grid auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[240px]">
            {categories.slice(0, 4).map((c, i) => (
              <button
                key={c.key}
                type="button"
                onClick={() => pickCategory(c.key)}
                aria-label={`Show ${c.label.toLowerCase()} workshops (${c.count} upcoming)`}
                className={cn(
                  "group relative overflow-hidden rounded-2xl text-left outline-none focus-visible:ring-3 focus-visible:ring-[#111]/40",
                  SPANS[Math.min(categories.length, 4)][i],
                )}
              >
                <Image
                  src={c.images[0].src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.04]"
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#111]/75 via-[#111]/15 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
                  <span>
                    <span className="font-display block text-2xl text-white md:text-[1.75rem]">{c.label}</span>
                    <span className="mt-1 block max-w-[34ch] text-sm text-white/80">{c.blurb}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-[#111] tabular-nums">
                    {c.count} upcoming
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Coming up */}
      <section
        id="workshops"
        aria-labelledby="workshops-title"
        className="scroll-mt-20 border-t border-border bg-white"
      >
        <div ref={gridRef} className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
          <h2 id="workshops-title" className="font-display text-[2.25rem] leading-[1.1] text-[#111] md:text-[2.75rem]">
            Coming up
          </h2>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="radiogroup" aria-label="Category" className="flex flex-wrap gap-1.5">
              {[{ key: "all" as const, label: "All" }, ...categories].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={category === c.key}
                  onClick={() => {
                    setCategory(c.key);
                    setShowAll(false);
                  }}
                  className={cn(
                    "press h-9 rounded-full border px-4 text-sm",
                    category === c.key
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-[#e3e2df] bg-white text-[#2f3437] hover:border-[#c9c8c4]",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect aria-label="Studio" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">All studios</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-[#2f3437]">
                <Switch checked={seatsOnly} onCheckedChange={setSeatsOnly} aria-label="Only show workshops with free seats" />
                Free seats only
              </label>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "workshop" : "workshops"}
            {filtersActive && " match your filters"}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#d6d5d1]">
              <EmptyState
                icon={<MagnifyingGlass size={22} weight="bold" />}
                title={workshops.length === 0 ? "New workshops are on the way" : "Nothing matches right now"}
                description={
                  workshops.length === 0
                    ? "The next season is being scheduled. Call the front desk to hear what's planned."
                    : "Try another studio or category, or include full workshops to join a waitlist."
                }
                action={
                  filtersActive && (
                    <Button variant="outline" onClick={reset}>
                      Clear filters
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <ul className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((w, i) => (
                <li key={w.id} className="reveal flex" style={{ "--i": i % 6 } as React.CSSProperties}>
                  <WorkshopCard w={w} />
                </li>
              ))}
            </ul>
          )}

          {!showAll && filtered.length > INITIAL && (
            <div className="mt-10 flex justify-center">
              <Button variant="outline" size="lg" className="h-11 px-6" onClick={() => setShowAll(true)}>
                Show all {filtered.length} workshops
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
