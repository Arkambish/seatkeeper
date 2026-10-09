import { formatDateTime } from "@/lib/time";
import type { AuditEntry } from "@/lib/types";

const LABELS: Record<string, string> = {
  code: "Code",
  title: "Title",
  description: "Description",
  instructor: "Instructor",
  locationId: "Location",
  startsAt: "Start",
  endsAt: "End",
  capacity: "Capacity",
  status: "Status",
  name: "Name",
  email: "Email",
  role: "Role",
  isActive: "Active",
};

export type Lookups = { location?: (id: string) => string | undefined };

function show(key: string, value: unknown, lookups: Lookups): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if ((key === "startsAt" || key === "endsAt") && typeof value === "string") return formatDateTime(value);
  if (key === "locationId" && typeof value === "string") return lookups.location?.(value) ?? "another location";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (key === "role" || key === "status") return String(value).toLowerCase();
  return String(value);
}

/** Field-level changes as "Capacity: 12 → 14". */
export function describeChanges(entry: AuditEntry, lookups: Lookups = {}) {
  const after = entry.after ?? {};
  const before = entry.before ?? {};
  return Object.keys(after).map((key) => ({
    field: LABELS[key] ?? key,
    from: entry.before ? show(key, before[key], lookups) : null,
    to: show(key, after[key], lookups),
  }));
}

export const ACTION_LABELS: Record<string, string> = {
  "workshop.create": "created the workshop",
  "workshop.update": "edited the workshop",
  "workshop.delete": "deleted the workshop",
  "location.create": "added a location",
  "location.update": "renamed a location",
  "location.delete": "deleted a location",
  "user.create": "created an account",
  "user.update": "updated an account",
  "user.role_change": "changed a role",
  "user.activate": "re-activated an account",
  "user.deactivate": "deactivated an account",
  "user.password_reset": "reset a password",
  "user.password_change": "changed their own password",
};
