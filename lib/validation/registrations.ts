import { z } from "zod";
import { email, registrationStatusSchema } from "./common";

export const registerAttendeeSchema = z.object({
  attendeeName: z.string().trim().min(1, "Name is required").max(120),
  attendeeEmail: email,
  /** Join the waitlist instead (only allowed when the workshop is full). */
  waitlist: z.boolean().optional().default(false),
});
export type RegisterAttendeeInput = z.infer<typeof registerAttendeeSchema>;

export const cancelRegistrationSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const registrationFiltersSchema = z.object({
  status: registrationStatusSchema.optional(),
});
