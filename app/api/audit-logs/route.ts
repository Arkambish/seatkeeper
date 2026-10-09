import { z } from "zod";
import { parseQuery, withAuth } from "@/lib/api/handler";
import { can } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors";
import { listAudit } from "@/lib/services/audit";
import { pageParams, uuid } from "@/lib/validation/common";

const querySchema = z.object({
  entityType: z.enum(["user", "workshop"]),
  entityId: uuid.optional(),
  ...pageParams,
});

/**
 * Audit trail. Visibility follows the same matrix as the data itself:
 * account history is for Admins, workshop history for Managers and Staff.
 */
export const GET = withAuth("authenticated", async ({ req, user }) => {
  const q = parseQuery(req, querySchema);
  const needed = q.entityType === "user" ? "users:manage" : "workshops:read";
  if (!can(user.role, needed)) throw new AppError("FORBIDDEN", "You don't have permission to do that.");
  return listAudit(q);
});
