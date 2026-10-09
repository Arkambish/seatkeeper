"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui";
import { PasswordInput } from "@/components/app/password-input";
import { apiFetch, isApiError } from "@/lib/query/api";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

const DEMO = [
  { label: "Admin", email: "admin@example.com", password: "Admin123!" },
  { label: "Manager", email: "manager@example.com", password: "Manager123!" },
  { label: "Staff", email: "staff@example.com", password: "Staff123!" },
];

export function LoginForm({ showDemoAccounts }: { showDemoAccounts: boolean }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { redirectTo } = await apiFetch<{ redirectTo: string }>(
        "/api/auth/login",
        {
          method: "POST",
          body: values,
        },
      );
      router.replace(redirectTo);
      router.refresh();
    } catch (e) {
      setFormError(
        isApiError(e) ? e.message : "Something went wrong. Please try again.",
      );
    }
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            className="h-10 bg-white"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            className="h-10 bg-white"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </Field>
        {formError && (
          <p
            role="alert"
            className="rounded-md bg-[var(--pastel-red)] px-3 py-2 text-sm text-[var(--pastel-red-fg)]"
          >
            {formError}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="mt-2 h-10"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {showDemoAccounts && (
        <div className="mt-10 border-t border-border pt-5">
          <p className="mb-3 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
            Demo accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setValue("email", d.email);
                  setValue("password", d.password);
                }}
                className="press rounded-md border border-border bg-white px-2 py-2 text-left hover:border-[#d6d5d1]"
              >
                <span className="block text-[13px] text-[#111]">{d.label}</span>
                <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                  {d.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
