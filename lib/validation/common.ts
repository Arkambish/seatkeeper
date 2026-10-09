import { z } from "zod";

// Literal enums (not imported from @prisma/client) so these schemas are safe
// to bundle into the browser for form validation.
export const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;
export const WORKSHOP_STATUSES = ["SCHEDULED", "CANCELLED", "COMPLETED"] as const;
export const REGISTRATION_STATUSES = ["ACTIVE", "CANCELLED", "WAITLISTED"] as const;

export const roleSchema = z.enum(ROLES);
export const workshopStatusSchema = z.enum(WORKSHOP_STATUSES);
export const registrationStatusSchema = z.enum(REGISTRATION_STATUSES);

export const uuid = z.string().uuid("Invalid id");
export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const isoDateTime = z.string().datetime({ offset: true, message: "Invalid date/time" });
export const booleanParam = z.enum(["true", "false"]).transform((v) => v === "true");
