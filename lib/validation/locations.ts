import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80, "At most 80 characters"),
});
export type LocationInput = z.infer<typeof locationSchema>;
