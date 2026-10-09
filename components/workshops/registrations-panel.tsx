"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useMe } from "@/components/app/me-context";
import { EmptyState, RegistrationPill, Surface } from "@/components/app/ui";
import { useCancelRegistration } from "@/hooks/queries";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Registration, RegistrationStatus, WorkshopDetail } from "@/lib/types";
import { WorkshopHistory } from "./workshop-history";

type Tab = "ACTIVE" | "WAITLISTED" | "CANCELLED" | "ALL" | "CHANGES";

/**
 * All registrations for a workshop come back in one request (a workshop holds
 * at most a few dozen rows), so switching tabs is instant and needs no fetch.
 */
export function RegistrationsPanel({
  workshop,
  registrations,
  canCancel,
}: {
  workshop: WorkshopDetail;
  registrations: Registration[];
  canCancel: boolean;
}) {
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [confirming, setConfirming] = useState<Registration | null>(null);

  const count = (s: RegistrationStatus) => registrations.filter((r) => r.status === s).length;
  const tabs: [Tab, string, number | null][] = [
    ["ACTIVE", "Registered", count("ACTIVE")],
    ["WAITLISTED", "Waitlist", count("WAITLISTED")],
    ["CANCELLED", "Cancelled", count("CANCELLED")],
    ["ALL", "Full history", registrations.length],
    ["CHANGES", "Workshop changes", null],
  ];

  // The API returns newest first, with the true queue order as tie-breaker,
  // so reversing the waitlist gives first-in-line at the top.
  const filtered = tab === "ALL" || tab === "CHANGES" ? registrations : registrations.filter((r) => r.status === tab);
  const rows = tab === "WAITLISTED" ? [...filtered].reverse() : filtered;

  return (
    <section className="mt-10">
      <div role="tablist" aria-label="Registrations" className="mb-4 flex flex-wrap gap-1 border-b border-border">
        {tabs.map(([value, label, n]) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px border-b-2 px-3 pt-1 pb-2.5 text-sm transition-colors",
              tab === value ? "border-[#111] text-[#111]" : "border-transparent text-muted-foreground hover:text-[#111]",
            )}
          >
            {label}
            {n !== null && <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">{n}</span>}
          </button>
        ))}
      </div>

      {tab === "CHANGES" ? (
        <WorkshopHistory workshopId={workshop.id} />
      ) : (
        <Surface className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState title={tab === "WAITLISTED" ? "Nobody is waiting" : tab === "CANCELLED" ? "No cancellations" : "No registrations yet"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                    {tab === "WAITLISTED" && <th className="w-12 px-5 py-3 font-normal">#</th>}
                    <th className="px-5 py-3 font-normal">Attendee</th>
                    <th className="px-5 py-3 font-normal">Status</th>
                    <th className="px-5 py-3 font-normal">Registered</th>
                    <th className="px-5 py-3 font-normal">Cancelled</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const pending = r.id.startsWith("optimistic-");
                    return (
                      <tr key={r.id} className={cn("border-b border-border last:border-0", pending && "row-pending")}>
                        {tab === "WAITLISTED" && <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{i + 1}</td>}
                        <td className="px-5 py-3.5">
                          <div className="text-[#111]">{r.attendeeName}</div>
                          <div className="text-xs text-muted-foreground">{r.attendeeEmail}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <RegistrationPill status={r.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <Who at={r.registeredAt} by={r.registeredBy.name} />
                          {r.promotedAt && <div className="mt-0.5 text-xs text-[var(--pastel-green-fg)]">From waitlist {formatDateTime(r.promotedAt)}</div>}
                        </td>
                        <td className="px-5 py-3.5">
                          {r.cancelledAt && r.cancelledBy ? (
                            <>
                              <Who at={r.cancelledAt} by={r.cancelledBy.name} />
                              {r.cancelReason && <div className="mt-0.5 text-xs text-muted-foreground italic">“{r.cancelReason}”</div>}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {canCancel && r.status !== "CANCELLED" && !pending && (
                            <button
                              type="button"
                              onClick={() => setConfirming(r)}
                              className="press rounded-md px-2.5 py-1 text-sm text-[var(--pastel-red-fg)] hover:bg-[var(--pastel-red)]"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      )}

      <CancelDialog
        workshopId={workshop.id}
        registration={confirming}
        hasWaitlist={workshop.waitlistCount > 0}
        onClose={() => setConfirming(null)}
      />
    </section>
  );
}

function Who({ at, by }: { at: string; by: string }) {
  return (
    <>
      <div className="text-[#2f3437]">{formatDateTime(at)}</div>
      <div className="text-xs text-muted-foreground">by {by}</div>
    </>
  );
}

function CancelDialog({
  workshopId,
  registration,
  hasWaitlist,
  onClose,
}: {
  workshopId: string;
  registration: Registration | null;
  hasWaitlist: boolean;
  onClose: () => void;
}) {
  const me = useMe();
  const cancel = useCancelRegistration(workshopId, me);
  const [reason, setReason] = useState("");

  const confirm = () => {
    if (!registration) return;
    const name = registration.attendeeName;
    cancel.mutate(
      { id: registration.id, reason },
      {
        onSuccess: ({ promoted }) =>
          toast.success(`${name}'s registration was cancelled`, {
            description: promoted ? "The seat went to the next person on the waitlist." : "The seat is free again.",
          }),
        onError: (e) => toast.error(e.message),
      },
    );
    setReason("");
    onClose();
  };

  return (
    <AlertDialog open={!!registration} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl font-normal">Cancel {registration?.attendeeName}&apos;s registration?</AlertDialogTitle>
          <AlertDialogDescription>
            {registration?.status === "WAITLISTED"
              ? "They will be removed from the waitlist."
              : hasWaitlist
                ? "Their seat goes straight to the first person on the waitlist. The record stays in the history with your name on it."
                : "Their seat is freed straight away. The record stays in the history with your name on it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          placeholder="Reason (optional)"
          aria-label="Cancellation reason"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          className="bg-white"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep registration</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} className="bg-[var(--pastel-red-fg)] text-white hover:bg-[#862826]">
            Cancel registration
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
