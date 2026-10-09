import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/app/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Already signed in? Skip the form. Streams in; the form itself is static. */
async function RedirectIfSignedIn(): Promise<null> {
  const me = await getCurrentUser();
  if (me) redirect(homePathFor(me.role));
  return null;
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6 py-16">
      {/* Barely-there warm light so the canvas doesn't feel flat. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,196,160,0.18),transparent_60%)]"
      />
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="fade-in relative w-full max-w-sm">
        <Logo subtitle className="mb-12" />
        <h1 className="font-display text-[2.5rem] text-[#111]">Sign in</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          Staff accounts are created by an administrator.
        </p>
        <LoginForm showDemoAccounts={process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true"} />
      </div>
    </main>
  );
}
