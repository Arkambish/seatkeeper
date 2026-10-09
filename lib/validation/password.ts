import { z } from "zod";

export const newPassword = z
  .string()
  .min(8, "At least 8 characters")
  .max(200, "At most 200 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from the current one",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
