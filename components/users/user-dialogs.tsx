"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/app/ui";
import { useCreateUser, useUpdateUser } from "@/hooks/queries";
import { isApiError } from "@/lib/query/api";
import type { User } from "@/lib/types";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/users";

export function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "STAFF", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: (u) => {
        toast.success(`Account created for ${u.name}`, { description: "Share the temporary password with them in person." });
        onClose();
      },
      onError: (e) => {
        if (isApiError(e) && e.fields) {
          for (const [k, m] of Object.entries(e.fields)) form.setError(k as keyof CreateUserInput, { message: m[0] });
        } else toast.error(e.message);
      },
    }),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">New account</DialogTitle>
            <DialogDescription>There is no public sign-up. Accounts are only created here.</DialogDescription>
          </DialogHeader>
          <Field label="Full name" htmlFor="u-name" error={errors.name?.message}>
            <Input id="u-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
          <Field label="Email" htmlFor="u-email" error={errors.email?.message}>
            <Input id="u-email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...form.register("email")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" htmlFor="u-role" error={errors.role?.message}>
              <NativeSelect id="u-role" className="w-full" {...form.register("role")}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </NativeSelect>
            </Field>
            <Field label="Temporary password" htmlFor="u-password" error={errors.password?.message}>
              <Input id="u-password" type="text" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const resetSchema = z.object({ password: z.string().min(8, "At least 8 characters").max(200) });

export function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const update = useUpdateUser();
  const form = useForm<{ password: string }>({ resolver: zodResolver(resetSchema), defaultValues: { password: "" } });

  const onSubmit = form.handleSubmit(({ password }) =>
    update.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.name}`, { description: "They have been signed out everywhere." });
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    ),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-normal">Reset password</DialogTitle>
            <DialogDescription>Set a new temporary password for {user.name}. Their current sessions end immediately.</DialogDescription>
          </DialogHeader>
          <Field label="New password" htmlFor="r-password" error={form.formState.errors.password?.message}>
            <Input id="r-password" type="text" autoFocus autoComplete="new-password" {...form.register("password")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
