import { z } from "zod";
import { email } from "./common";

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;
