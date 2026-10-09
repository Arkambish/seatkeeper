import Link from "next/link";
import { Logo } from "./logo";

/**
 * The header's static frame (no hooks), shared by the real header and the
 * loading shell so the bar never shifts when the session streams in.
 */
export function HeaderFrame({
  nav,
  actions,
  homeHref = "/",
}: {
  nav?: React.ReactNode;
  actions?: React.ReactNode;
  homeHref?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#fbfbfa]/85 backdrop-blur-md supports-[backdrop-filter]:bg-[#fbfbfa]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6 sm:gap-6">
        <Link href={homeHref} aria-label="Seatkeeper home" className="rounded-md outline-offset-4">
          <Logo className="max-sm:[&>span:last-child]:hidden" />
        </Link>
        <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex h-full min-w-0 flex-1 items-center">{nav}</div>
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      </div>
    </header>
  );
}
