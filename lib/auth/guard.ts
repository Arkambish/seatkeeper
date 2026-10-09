import "server-only";
import { redirect } from "next/navigation";
import { can, homePathFor, type Permission } from "./permissions";
import { getCurrentUser } from "./session";

/**
 * Page-level guard for Server Components. Unauthorised users are sent to
 * their own home page instead of seeing a broken screen. The API behind every
 * page enforces the same rule independently.
 */
export async function requirePermission(permission: Permission) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!can(me.role, permission)) redirect(homePathFor(me.role));
  return me;
}
