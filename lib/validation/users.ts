import { z } from "zod";
import { email, roleSchema } from "./common";

const password = z.string().min(8, "At least 8 characters").max(200);
const name = z.string().trim().min(1, "Name is required").max(120);

export const createUserSchema = z.object({ name, email, role: roleSchema, password });
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({ name, role: roleSchema, isActive: z.boolean(), password })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
