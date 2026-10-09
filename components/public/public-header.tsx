import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/app/logo";
import { StaffLink, StaffLinkFallback } from "./staff-link";

const NAV = [
  { href: "/#workshops", label: "Workshops" },
  { href: "/#booking", label: "How to book" },
  { href: "/#locations", label: "Locations" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#fbfbfa]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Seatkeeper home" className="rounded-md outline-offset-4">
          <Logo subtitle />
        </Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-[#111]"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto md:ml-2">
          <Suspense fallback={<StaffLinkFallback />}>
            <StaffLink />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
