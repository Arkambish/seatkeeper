import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Armchair, MagnifyingGlass, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { CatalogueExplorer } from "@/components/public/catalogue-explorer";
import { PublicFooter } from "@/components/public/public-footer";
import { SeatStatus } from "@/components/public/seat-status";
import { BRAND } from "@/lib/brand";
import { getPublicCatalogue } from "@/lib/services/public";
import { formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.organisation} workshops · ${BRAND.name}` },
  description:
    "Small, friendly workshops in pottery, coding, fitness and art across three studios. See what's on and how many seats are left.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

/**
 * Public landing page. Static shell + cached catalogue data, so it's served
 * instantly; seat counts refresh in the background after any booking.
 */
export default async function LandingPage() {
  const { workshops, locations } = await getPublicCatalogue();
  const nextUp = workshops.find((w) => w.seatsLeft > 0) ?? workshops[0];
  const perLocation = new Map(locations.map((l) => [l.id, workshops.filter((w) => w.location.id === l.id).length]));

  return (
    <main>
      {/* Hero: asymmetric split, real photo, one live "next up" card */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(217,164,65,0.10),transparent_55%)]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
          <div className="fade-in">
            <h1 className="font-display max-w-[17ch] text-[2.9rem] leading-[1.05] text-[#111] sm:text-6xl lg:text-[4.25rem]">
              Learn something new with your hands.
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[#5f5e5b]">
              Small, friendly workshops in pottery, coding, fitness and art across three studios in Colombo.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#workshops" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-[15px]")}>
                Browse workshops <ArrowRight weight="bold" aria-hidden />
              </a>
              <a
                href={BRAND.contact.phoneHref}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-[15px]")}
              >
                <Phone weight="bold" aria-hidden /> Call to book
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#efeeeb] sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src="/images/workshops/pottery.jpg"
                alt="Hands shaping a clay pot on a spinning pottery wheel"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
            {nextUp && (
              <Link
                href={`/classes/${nextUp.id}`}
                className="group absolute -bottom-6 left-4 w-[min(320px,calc(100%-2rem))] rounded-2xl border border-border bg-white/95 p-5 shadow-[0_12px_40px_rgba(47,52,55,0.10)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5 sm:left-6 lg:-left-10"
              >
                <span className="text-xs font-medium text-muted-foreground">Next up</span>
                <span className="font-display mt-1 block text-xl leading-snug text-[#111] group-hover:underline group-hover:decoration-[#d6d5d1] group-hover:underline-offset-4">
                  {nextUp.title}
                </span>
                <span className="mt-1 block text-sm text-[#5f5e5b]">
                  {formatDate(nextUp.startsAt)}, {formatTime(nextUp.startsAt)}
                </span>
                <SeatStatus seatsLeft={nextUp.seatsLeft} className="mt-3" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <CatalogueExplorer workshops={workshops} locations={locations} />

      {/* How booking works: tinted band, three plain steps */}
      <section id="booking" aria-labelledby="booking-title" className="scroll-mt-20 bg-[#f3f2ef]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24">
          <h2 id="booking-title" className="font-display max-w-2xl text-[2.25rem] leading-[1.1] text-[#111] md:text-[2.75rem]">
            Booking is one phone call
          </h2>
          <p className="mt-4 max-w-[60ch] text-[#5f5e5b]">
            Our front desk holds your seat while you&apos;re on the line, so the class can never be overbooked.
          </p>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                icon: MagnifyingGlass,
                title: "Find a workshop",
                body: "Browse what's on above and note the workshop's name or code.",
              },
              {
                icon: Phone,
                title: "Call or drop by",
                body: `Give us your name and email on ${BRAND.contact.phone}, or visit any studio's front desk.`,
              },
              {
                icon: Armchair,
                title: "Your seat is held",
                body: "Can't make it after all? Let us know and the seat goes to the next person on the waitlist.",
              },
            ].map((s) => (
              <li key={s.title} className="flex flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl border border-[#e3e2df] bg-white text-[#111]">
                  <s.icon size={20} weight="bold" aria-hidden />
                </span>
                <h3 className="text-lg font-medium text-[#111]">{s.title}</h3>
                <p className="max-w-[36ch] text-[15px] leading-relaxed text-[#5f5e5b]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Studios: image + list split */}
      <section id="locations" aria-labelledby="locations-title" className="scroll-mt-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#efeeeb]">
            <Image
              src="/images/workshops/fitness-alt.jpg"
              alt="An instructor leading a seated stretching class in a bright studio"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <h2 id="locations-title" className="font-display text-[2.25rem] leading-[1.1] text-[#111] md:text-[2.75rem]">
              Three studios, one front desk
            </h2>
            <p className="mt-4 max-w-[52ch] text-[#5f5e5b]">
              Book any workshop at any studio with a single call. {BRAND.contact.hours}.
            </p>
            <ul className="mt-8 divide-y divide-border border-y border-border">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-4 py-4">
                  <span className="flex items-center gap-3 text-[#111]">
                    <MapPin size={18} className="text-muted-foreground" aria-hidden />
                    {l.name}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {perLocation.get(l.id) ? `${perLocation.get(l.id)} upcoming` : "New dates soon"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <PublicFooter locations={locations} />
    </main>
  );
}
