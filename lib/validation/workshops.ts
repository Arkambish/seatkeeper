import { z } from "zod";
import { booleanParam, isoDateTime, uuid, workshopStatusSchema } from "./common";

const fields = {
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, "2–30 letters, digits or dashes"),
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  instructor: z.string().trim().min(1, "Instructor is required").max(120),
  locationId: uuid,
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  capacity: z.coerce.number().int().min(1, "At least 1 seat").max(1000),
  status: workshopStatusSchema,
};

const endsAfterStarts = (v: { startsAt?: string; endsAt?: string }) =>
  !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt);
const endsAfterStartsError = { message: "End must be after start", path: ["endsAt"] };

export const createWorkshopSchema = z
  .object({ ...fields, status: fields.status.default("SCHEDULED") })
  .refine(endsAfterStarts, endsAfterStartsError);
export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;

export const updateWorkshopSchema = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update")
  .refine(endsAfterStarts, endsAfterStartsError);
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;

export const workshopFiltersSchema = z.object({
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  /** Without from/to, only workshops that haven't ended are listed unless this is true. */
  includePast: booleanParam.optional(),
  status: workshopStatusSchema.optional(),
  hasSeats: booleanParam.optional(),
  locationId: uuid.optional(),
  q: z.string().trim().max(100).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type WorkshopFilters = z.infer<typeof workshopFiltersSchema>;
