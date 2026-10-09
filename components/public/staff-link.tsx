import Link from "next/link";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const cls =
  "press inline-flex h-9 items-center rounded-md border border-[#e3e2df] bg-white px-3.5 text-sm text-[#2f3437] hover:border-[#d6d5d1] hover:text-[#111]";

/** Reads the session cookie, so it streams in behind Suspense; the page stays static. */
export async function StaffLink({ className }: { className?: string }) {
  const me = await getCurrentUser();
  return me ? (
    <Link href={homePathFor(me.role)} className={cn(cls, className)}>
      Open dashboard
    </Link>
  ) : (
    <StaffLinkFallback className={className} />
  );
}

export function StaffLinkFallback({ className }: { className?: string }) {
  return (
    <Link href="/login" className={cn(cls, className)}>
      Staff sign in
    </Link>
  );
}
