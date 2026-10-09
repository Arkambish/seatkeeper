import { fromLocalInput, presetRange } from "@/lib/time";
import type { WorkshopStatus } from "@/lib/types";
import { WORKSHOP_STATUSES } from "@/lib/validation/common";

/**
 * Filters as they live in the URL (shareable, back-button friendly). The same
 * parser runs on the server (to prefetch) and the client (to fetch), so both
 * produce an identical query key and the hydrated data is used as-is.
 */
export const RANGES = ["upcoming", "this-week", "next-7-days", "all", "custom"] as const;
export type Range = (typeof RANGES)[number];

export type UiFilters = {
  range: Range;
  from?: string; // YYYY-MM-DD (custom range)
  to?: string; // YYYY-MM-DD inclusive (custom range)
  status?: WorkshopStatus;
  hasSeats: boolean;
  locationId?: string;
  q?: string;
};

type SearchLike = URLSearchParams | Record<string, string | string[] | undefined>;

const get = (sp: SearchLike, key: string) => {
  const v = sp instanceof URLSearchParams ? sp.get(key) : sp[key];
  return (Array.isArray(v) ? v[0] : v) || undefined;
};
const isDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export function parseUiFilters(sp: SearchLike): UiFilters {
  const range = get(sp, "range") as Range | undefined;
  const status = get(sp, "status") as WorkshopStatus | undefined;
  return {
    range: range && RANGES.includes(range) ? range : "upcoming",
    from: isDate(get(sp, "from")),
    to: isDate(get(sp, "to")),
    status: status && WORKSHOP_STATUSES.includes(status) ? status : undefined,
    hasSeats: get(sp, "hasSeats") === "true",
    locationId: get(sp, "locationId"),
    q: get(sp, "q")?.slice(0, 100),
  };
}

export function toSearchParams(f: UiFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.range !== "upcoming") sp.set("range", f.range);
  if (f.range === "custom") {
    if (f.from) sp.set("from", f.from);
    if (f.to) sp.set("to", f.to);
  }
  if (f.status) sp.set("status", f.status);
  if (f.hasSeats) sp.set("hasSeats", "true");
  if (f.locationId) sp.set("locationId", f.locationId);
  if (f.q) sp.set("q", f.q);
  return sp;
}

/** UI filters → API query params (also the query key). */
export function toApiParams(f: UiFilters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.range === "this-week" || f.range === "next-7-days") Object.assign(p, presetRange(f.range));
  if (f.range === "all") p.includePast = "true";
  if (f.range === "custom") {
    if (f.from) p.from = fromLocalInput(`${f.from}T00:00`);
    if (f.to) {
      // Inclusive end date → midnight at the start of the following day (DST-safe).
      const [y, m, d] = f.to.split("-").map(Number);
      const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
      p.to = fromLocalInput(`${next}T00:00`);
    }
    if (!f.from && !f.to) p.includePast = "true";
  }
  if (f.status) p.status = f.status;
  if (f.hasSeats) p.hasSeats = "true";
  if (f.locationId) p.locationId = f.locationId;
  if (f.q) p.q = f.q;
  return p;
}
