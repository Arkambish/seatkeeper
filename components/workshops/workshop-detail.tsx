"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, PencilSimple } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { useCan, useMe } from "@/components/app/me-context";
import { PageHeader, SeatMeter, StatusPill, Surface } from "@/components/app/ui";
import { useRegistrations, useWorkshop } from "@/hooks/queries";
import { formatDateTime, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { RegisterForm } from "./register-form";
import { RegistrationsPanel } from "./registrations-panel";

export function WorkshopDetailView({ id }: { id: string }) {
  const { data: w } = useWorkshop(id);
  const { data: regs = [] } = useRegistrations(id);
  const me = useMe();
  const canEdit = useCan("workshops:write");
  const [now] = useState(() => Date.now());

  if (!w) return null; // always hydrated from the server

  const open = w.status === "SCHEDULED" && new Date(w.endsAt).getTime() > now;
  const full = w.seatsLeft <= 0;

  return (
    <div className="fade-in">
      <Link href="/workshops" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#111]">
        <ArrowLeft size={14} weight="bold" /> All workshops
      </Link>

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            {w.code} <StatusPill status={w.status} />
          </span>
        }
        title={w.title}
        description={w.description}
        actions={
          canEdit && (
            <Link href={`/workshops/${w.id}/edit`} className={buttonVariants({ variant: "outline" })}>
              <PencilSimple weight="bold" /> Edit workshop
            </Link>
          )
        }
      />

      {/* Bento: facts + seats, then the front-desk action */}
      <div className="grid gap-4 md:grid-cols-3">
        <Surface className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 md:col-span-2 md:p-8">
          <Fact label="When">
            {formatDateTime(w.startsAt)}
            <span className="text-muted-foreground"> – {formatTime(w.endsAt)}</span>
          </Fact>
          <Fact label="Location">{w.location.name}</Fact>
          <Fact label="Instructor">{w.instructor}</Fact>
          <Fact label="Last edited">
            {w.updatedBy.name}
            <span className="block text-xs text-muted-foreground">{formatDateTime(w.updatedAt)}</span>
          </Fact>
        </Surface>

        <Surface className="flex flex-col justify-between gap-6 p-6 md:p-8">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">Seats left</p>
            <p className={cn("font-display mt-2 text-5xl tabular-nums", full ? "text-[var(--pastel-red-fg)]" : "text-[#111]")}>
              {w.status === "SCHEDULED" ? w.seatsLeft : "—"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <SeatMeter used={w.activeCount} capacity={w.capacity} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {w.activeCount} of {w.capacity} registered
              {w.waitlistCount > 0 && ` · ${w.waitlistCount} waiting`}
            </p>
          </div>
        </Surface>
      </div>

      <Surface className="mt-4 p-6 md:p-8">
        {open ? (
          <RegisterForm workshopId={w.id} full={full} me={me} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {w.status === "CANCELLED"
              ? "This workshop was cancelled, so registration is closed."
              : "This workshop has finished, so registration is closed."}
          </p>
        )}
      </Surface>

      <RegistrationsPanel workshop={w} registrations={regs} canCancel={open} />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="text-[15px] text-[#111]">{children}</div>
    </div>
  );
}
