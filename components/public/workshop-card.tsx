import Image from "next/image";
import Link from "next/link";
import { CalendarBlank, MapPin, User } from "@phosphor-icons/react/dist/ssr";
import { categoryOf, imageFor } from "@/lib/catalogue";
import type { PublicWorkshop } from "@/lib/services/public";
import { formatDate, formatTime } from "@/lib/time";
import { SeatStatus } from "./seat-status";

export function WorkshopCard({ w, priority = false }: { w: PublicWorkshop; priority?: boolean }) {
  const img = imageFor(w.code);
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(47,52,55,0.06)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#efeeeb]">
        <Image
          src={img.src}
          alt={img.alt}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">{categoryOf(w.code).label}</span>
          <SeatStatus seatsLeft={w.seatsLeft} />
        </div>
        <h3 className="font-display text-[1.45rem] leading-tight text-[#111]">
          <Link href={`/classes/${w.id}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {w.title}
          </Link>
        </h3>
        <dl className="mt-auto grid gap-1.5 text-sm text-[#2f3437]">
          <div className="flex items-center gap-2">
            <dt className="sr-only">When</dt>
            <CalendarBlank size={15} className="shrink-0 text-muted-foreground" aria-hidden />
            <dd>
              {formatDate(w.startsAt)}, {formatTime(w.startsAt)} to {formatTime(w.endsAt)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Where</dt>
            <MapPin size={15} className="shrink-0 text-muted-foreground" aria-hidden />
            <dd>{w.location.name}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Instructor</dt>
            <User size={15} className="shrink-0 text-muted-foreground" aria-hidden />
            <dd>{w.instructor}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
