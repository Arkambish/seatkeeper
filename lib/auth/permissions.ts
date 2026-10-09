import type { Role } from "@prisma/client";

/**
 * The single source of truth for "who can do what", taken directly from the
 * client's matrix. Every API route declares the permission it needs and the
 * server checks it here; the UI only uses it to hide links it would refuse.
 *
 * Note: the spec deliberately gives Admins *only* account management, so an
 * Admin cannot view or change workshops or registrations.
 */
export type Permission =
  | "users:manage"
  | "workshops:write"
  | "workshops:read"
  | "registrations:write";

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ["users:manage"],
  MANAGER: ["workshops:write", "workshops:read", "registrations:write"],
  STAFF: ["workshops:read", "registrations:write"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** Where each role lands after login. */
export function homePathFor(role: Role): string {
  return role === "ADMIN" ? "/users" : "/workshops";
}
