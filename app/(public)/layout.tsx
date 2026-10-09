import { PublicHeader } from "@/components/public/public-header";

/** Public site chrome: no session required, indexable, cached. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-[#111] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <PublicHeader />
      <div id="content">{children}</div>
    </>
  );
}
