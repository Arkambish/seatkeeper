"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Check, Circle, LockKey } from "@phosphor-icons/react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch, isApiError } from "@/lib/query/api";
import { cn } from "@/lib/utils";
import { changePasswordSchema } from "@/lib/validation/password";
import { PasswordInput } from "./password-input";
import { Field } from "./ui";

// The API schema plus a confirmation field that only the form needs.
const formSchema = changePasswordSchema.and(z.object({ confirmPassword: z.string() })).refine(
  (v) => v.confirmPassword === v.newPassword,
  { message: "The passwords don't match", path: ["confirmPassword"] },
);
type FormValues = z.infer<typeof formSchema>;

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "At least one letter", test: (v) => /[A-Za-z]/.test(v) },
  { label: "At least one number", test: (v) => /[0-9]/.test(v) },
];

/**
 * `required`: first sign-in after an admin set a temporary password. The
 * dialog can't be dismissed (no close button, Escape or outside click), and
 * the API refuses everything else until the password is changed.
 */
export function ChangePasswordDialog({
  open,
  required = false,
  onClose,
}: {
  open: boolean;
  required?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const [next, confirm] = useWatch({ control: form.control, name: ["newPassword", "confirmPassword"] });

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await apiFetch("/api/auth/password", { method: "POST", body: { currentPassword, newPassword } });
      toast.success("Your password has been changed", {
        description: required ? "You're all set." : "Other devices have been signed out.",
      });
      form.reset();
      onClose?.();
      // Re-render the server layout so the gate lifts and the page loads.
      router.refresh();
    } catch (e) {
      if (isApiError(e) && e.fields) {
        for (const [k, msgs] of Object.entries(e.fields)) form.setError(k as keyof FormValues, { message: msgs[0] });
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't change your password.");
      }
    }
  });

  return (
    <Dialog
      open={open}
      disablePointerDismissal={required}
      onOpenChange={(isOpen) => {
        if (!isOpen && !required) onClose?.();
      }}
    >
      <DialogContent showCloseButton={!required} className="gap-5 sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            {required && (
              <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-[var(--pastel-yellow)] text-[var(--pastel-yellow-fg)]">
                <LockKey size={20} weight="bold" aria-hidden />
              </span>
            )}
            <DialogTitle className="font-display text-2xl font-normal">
              {required ? "Choose your own password" : "Change password"}
            </DialogTitle>
            <DialogDescription>
              {required
                ? "You signed in with a temporary password from your administrator. Set a password only you know to continue."
                : "Choose a new password. You'll stay signed in here; other devices will be signed out."}
            </DialogDescription>
          </DialogHeader>

          <Field
            label={required ? "Temporary password" : "Current password"}
            htmlFor="cp-current"
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              id="cp-current"
              autoComplete="current-password"
              autoFocus
              className="h-10 bg-white"
              aria-invalid={!!errors.currentPassword}
              {...form.register("currentPassword")}
            />
          </Field>

          <Field label="New password" htmlFor="cp-new" error={errors.newPassword?.message}>
            <PasswordInput
              id="cp-new"
              autoComplete="new-password"
              className="h-10 bg-white"
              aria-invalid={!!errors.newPassword}
              aria-describedby="cp-rules"
              {...form.register("newPassword")}
            />
          </Field>

          <ul id="cp-rules" className="-mt-2 grid gap-1 text-xs" aria-label="Password requirements">
            {RULES.map((r) => {
              const ok = r.test(next ?? "");
              return (
                <li
                  key={r.label}
                  className={cn("flex items-center gap-1.5 transition-colors", ok ? "text-[var(--pastel-green-fg)]" : "text-muted-foreground")}
                >
                  {ok ? <Check size={12} weight="bold" aria-hidden /> : <Circle size={12} aria-hidden />}
                  {r.label}
                  <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>

          <Field
            label="Confirm new password"
            htmlFor="cp-confirm"
            error={errors.confirmPassword?.message}
            hint={confirm && confirm === next ? "Passwords match" : undefined}
          >
            <PasswordInput
              id="cp-confirm"
              autoComplete="new-password"
              className="h-10 bg-white"
              aria-invalid={!!errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
          </Field>

          <DialogFooter>
            {!required && (
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className={cn(required && "w-full sm:w-auto")}>
              {isSubmitting ? "Saving…" : required ? "Set password and continue" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
