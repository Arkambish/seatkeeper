import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/app/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <LogoMark className="mb-4 size-10" />
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="font-display text-3xl text-[#111]">We couldn&apos;t find that page</h1>
      <Link href="/" className={buttonVariants({ variant: "outline" }) + " mt-4"}>
        Go back home
      </Link>
    </main>
  );
}
