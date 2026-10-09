import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app/app-nav";
import { FirstLoginGate } from "@/components/app/first-login-gate";
import { HeaderFrame } from "@/components/app/header-frame";
import { MeProvider } from "@/components/app/me-context";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * The frame (background, header bar) is prerendered as a static shell and
 * served instantly. Everything that depends on the session streams in
 * behind this Suspense boundary.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return (
    <MeProvider me={me}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-[#111] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppNav />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 pt-10 pb-24 outline-none">
        {/* Temporary password? Nothing else renders (or loads) until it's replaced. */}
        {me.mustChangePassword ? <FirstLoginGate /> : children}
      </main>
    </MeProvider>
  );
}

function ShellFallback() {
  return (
    <>
      <HeaderFrame actions={<Skeleton className="h-9 w-36 rounded-lg" />} />
      <main className="mx-auto w-full max-w-6xl px-6 pt-10" aria-busy>
        <Skeleton className="mb-3 h-3 w-20" />
        <Skeleton className="mb-10 h-9 w-56" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </main>
    </>
  );
}
