import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfWeek } from "date-fns";

/**
 * All three locations share one timezone. Formatting with an explicit zone on
 * both server and client keeps server-rendered HTML identical to the hydrated
 * client output, and "this week" means the same thing for every staff member.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC";

const inZone = (iso: string | Date) => new TZDate(new Date(iso).getTime(), APP_TIMEZONE);

export const formatDateTime = (iso: string) => format(inZone(iso), "EEE d MMM yyyy, HH:mm");
export const formatDate = (iso: string) => format(inZone(iso), "EEE d MMM");
export const formatTime = (iso: string) => format(inZone(iso), "HH:mm");

/** ISO instant → value for <input type="datetime-local"> in the centre's timezone. */
export const toLocalInput = (iso: string) => format(inZone(iso), "yyyy-MM-dd'T'HH:mm");

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
