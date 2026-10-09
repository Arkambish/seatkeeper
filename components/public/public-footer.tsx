import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { BRAND } from "@/lib/brand";

export function PublicFooter({ locations }: { locations: { id: string; name: string }[] }) {
  return (
    <footer className="border-t border-border bg-[#f7f6f3]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo subtitle />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Small-group workshops in pottery, coding, fitness and art, taught by local instructors.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium text-[#111]">Front desk</p>
          <a href={BRAND.contact.phoneHref} className="block text-[#2f3437] hover:text-[#111]">
            {BRAND.contact.phone}
          </a>
          <a href={`mailto:${BRAND.contact.email}`} className="mt-1 block text-[#2f3437] hover:text-[#111]">
            {BRAND.contact.email}
          </a>
          <p className="mt-1 text-muted-foreground">{BRAND.contact.hours}</p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium text-[#111]">Studios</p>
          <ul className="space-y-1 text-[#2f3437]">
            {locations.map((l) => (
              <li key={l.id}>{l.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{BRAND.organisation}</p>
          <Link href="/login" className="hover:text-[#111]">
            Staff sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
