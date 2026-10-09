import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  MapPin,
  Phone,
  User,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicFooter } from "@/components/public/public-footer";
import { WorkshopCard } from "@/components/public/workshop-card";
import { APP_URL, BRAND } from "@/lib/brand";
import { categoryOf, durationLabel, imageFor } from "@/lib/catalogue";
import { getPublicCatalogue, getPublicWorkshop, type PublicWorkshop } from "@/lib/services/public";
import { formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/validation/common";

async function load(id: string) {
  return uuid.safeParse(id).success ? getPublicWorkshop(id) : null;
}

export async function generateMetadata({ params }: PageProps<"/classes/[id]">): Promise<Metadata> {
  const w = await load((await params).id);
  if (!w) return { title: "Workshop not found" };
  const img = imageFor(w.code);
  const description = `${formatDate(w.startsAt)} at ${formatTime(w.startsAt)}, ${w.location.name}. ${w.description ?? ""}`.trim();
  return {
    title: w.title,
    description,
    robots: { index: w.status === "SCHEDULED", follow: true },
    alternates: { canonical: `/classes/${w.id}` },
    openGraph: { title: w.title, description, images: [{ url: img.src, alt: img.alt }] },
  };
}

export default function ClassPage({ params }: PageProps<"/classes/[id]">) {
  return (
    <Suspense fallback={<ClassSkeleton />}>
      <ClassDetail params={params} />
    </Suspense>
  );
}

async function ClassDetail({ params }: { params: PageProps<"/classes/[id]">["params"] }) {
  const { id } = await params;
  const [w, catalogue] = await Promise.all([load(id), getPublicCatalogue()]);
  if (!w) notFound();

  const category = categoryOf(w.code);
  const img = imageFor(w.code);
  const open = w.status === "SCHEDULED" && new Date(w.endsAt) > new Date(catalogue.generatedAt);
  const more = [
    ...catalogue.workshops.filter((o) => o.id !== w.id && categoryOf(o.code).key === category.key),
    ...catalogue.workshops.filter((o) => o.id !== w.id && categoryOf(o.code).key !== category.key),
  ].slice(0, 3);

  return (
    <main>
      <JsonLd w={w} />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <Link href="/#workshops" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#111]">
          <ArrowLeft size={14} weight="bold" aria-hidden /> All workshops
        </Link>
      </div>

      <article className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{category.label}</p>
          <h1 className="font-display mt-2 text-[2.6rem] leading-[1.05] text-[#111] md:text-[3.5rem]">{w.title}</h1>
          {w.description && <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[#5f5e5b]">{w.description}</p>}

          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl bg-[#efeeeb]">
            <Image src={img.src} alt={img.alt} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
          </div>

          <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <Fact icon={<CalendarBlank size={18} aria-hidden />} label="Date" value={formatDate(w.startsAt)} />
            <Fact
              icon={<Clock size={18} aria-hidden />}
              label="Time"
              value={`${formatTime(w.startsAt)} to ${formatTime(w.endsAt)} (${durationLabel(w.startsAt, w.endsAt)})`}
            />
            <Fact icon={<MapPin size={18} aria-hidden />} label="Studio" value={w.location.name} />
            <Fact icon={<User size={18} aria-hidden />} label="Instructor" value={w.instructor} />
            <Fact icon={<UsersThree size={18} aria-hidden />} label="Group size" value={`Up to ${w.capacity} people`} />
          </dl>
        </div>

        {/* Booking panel: sticks beside the details on desktop */}
        <aside className="lg:pt-24">
          <div className="rounded-3xl border border-border bg-white p-6 lg:sticky lg:top-24 md:p-7">
            {w.status === "CANCELLED" ? (
              <Notice title="This workshop has been cancelled">
                Call the front desk and we&apos;ll suggest another date or a similar class.
              </Notice>
            ) : !open ? (
              <Notice title="This workshop has finished">Have a look at what&apos;s coming up next.</Notice>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Availability</p>
                <p className="font-display mt-1 text-4xl text-[#111] tabular-nums">
                  {w.seatsLeft > 0 ? `${w.seatsLeft} of ${w.capacity}` : "Full"}
                </p>
                <p className="mt-1 text-sm text-[#5f5e5b]">
                  {w.seatsLeft > 0 ? "seats left" : "Join the waitlist and we'll call you if a seat frees up."}
                </p>
              </>
            )}

            <a
              href={BRAND.contact.phoneHref}
              className={cn(buttonVariants({ size: "lg" }), "mt-6 h-12 w-full text-[15px]")}
            >
              <Phone weight="bold" aria-hidden /> Call to book
            </a>
            <p className="mt-3 text-center text-sm text-[#5f5e5b] tabular-nums">{BRAND.contact.phone}</p>

            <div className="mt-6 border-t border-border pt-5 text-sm text-[#5f5e5b]">
              <p>
                Mention <span className="font-mono text-[13px] text-[#111]">{w.code}</span> when you call, or visit any
                studio&apos;s front desk. {BRAND.contact.hours}.
              </p>
            </div>
          </div>
        </aside>
      </article>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className="border-t border-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
            <div className="flex items-end justify-between gap-4">
              <h2 id="more-title" className="font-display text-3xl text-[#111] md:text-4xl">
                You might also like
              </h2>
              <Link href="/#workshops" className="hidden text-sm text-[#2f3437] underline-offset-4 hover:underline sm:block">
                See everything
              </Link>
            </div>
            <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {more.map((o) => (
                <li key={o.id} className="flex">
                  <WorkshopCard w={o} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <PublicFooter locations={catalogue.locations} />
    </main>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-[15px] text-[#111]">{value}</dd>
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <WarningCircle size={22} weight="bold" className="mt-0.5 shrink-0 text-[var(--pastel-red-fg)]" aria-hidden />
      <div>
        <p className="font-medium text-[#111]">{title}</p>
        <p className="mt-1 text-sm text-[#5f5e5b]">{children}</p>
      </div>
    </div>
  );
}

/** schema.org Event, so search engines can show date, place and availability. */
function JsonLd({ w }: { w: PublicWorkshop }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: w.title,
    description: w.description ?? undefined,
    startDate: w.startsAt,
    endDate: w.endsAt,
    eventStatus: w.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: w.location.name },
    image: [`${APP_URL}${imageFor(w.code).src}`],
    organizer: { "@type": "Organization", name: BRAND.organisation, url: APP_URL },
    performer: { "@type": "Person", name: w.instructor },
    maximumAttendeeCapacity: w.capacity,
    remainingAttendeeCapacity: w.seatsLeft,
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function ClassSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-12 w-3/4" />
        <Skeleton className="mt-10 aspect-[16/9] w-full rounded-3xl" />
      </div>
      <Skeleton className="h-80 rounded-3xl lg:mt-24" />
    </div>
  );
}
