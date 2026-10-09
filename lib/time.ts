import { TZDate } from "@date-fns/tz";
import { addDays, startOfWeek } from "date-fns";

/**
 * All three locations share one timezone. Formatting with an explicit zone on
 * both server and client keeps server-rendered HTML identical to the hydrated
 * client output, and "this week" means the same thing for every staff member.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC";

// Formatting uses Intl (deterministic, no hidden `new Date()`), so it is safe in
// prerendered pages and gives identical output on the server and in the browser.
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, ...opts });
const dateFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateTimeFmt = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const partsFmt = fmt({
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const at = (iso: string) => new Date(iso);

/** "Sat 10 Oct" */
export const formatDate = (iso: string) => dateFmt.format(at(iso)).replace(",", "");
/** "18:30" */
export const formatTime = (iso: string) => timeFmt.format(at(iso));
/** "Sat 10 Oct 2026, 18:30" */
export const formatDateTime = (iso: string) => `${dateTimeFmt.format(at(iso)).replace(",", "")}, ${formatTime(iso)}`;

/** ISO instant → value for <input type="datetime-local"> in the centre's timezone. */
export function toLocalInput(iso: string) {
  const p = Object.fromEntries(partsFmt.formatToParts(at(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** <input type="datetime-local"> value (centre's timezone) → ISO instant. */
export function fromLocalInput(value: string): string {
  const [date, time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new TZDate(y, m - 1, d, hh, mm, APP_TIMEZONE).toISOString();
}

export type RangePreset = "this-week" | "next-7-days";

/** Monday-to-Monday for "this week", or now → +7 days, in the centre's timezone. */
export function presetRange(preset: RangePreset, now = new Date()): { from: string; to: string } {
  const today = new TZDate(now.getTime(), APP_TIMEZONE);
  if (preset === "this-week") {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: addDays(start, 7).toISOString() };
  }
  const start = new TZDate(today.getTime(), APP_TIMEZONE);
  start.setHours(0, 0, 0, 0);
  return { from: start.toISOString(), to: addDays(start, 7).toISOString() };
}
