"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowCounterClockwise, Copy, DotsThree, PencilSimple, Prohibit, Trash } from "@phosphor-icons/react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/components/app/me-context";
import { useDeleteWorkshop, useSaveWorkshop } from "@/hooks/queries";
import { isApiError } from "@/lib/query/api";
import { cn } from "@/lib/utils";
import type { Workshop } from "@/lib/types";

type Confirm = "cancel" | "delete" | null;

/**
 * Manager actions for one workshop: edit, duplicate, cancel/reopen, delete.
 * Rendered only for roles that may write workshops. The API enforces the same.
 */
export function WorkshopActions({
  workshop,
  variant = "row",
}: {
  workshop: Pick<Workshop, "id" | "code" | "title" | "status" | "activeCount">;
  /** "row" sits above a clickable table row; "page" sits in a page header. */
  variant?: "row" | "page";
}) {
  const canWrite = useCan("workshops:write");
  const router = useRouter();
  const save = useSaveWorkshop(workshop.id);
  const remove = useDeleteWorkshop();
  const [confirm, setConfirm] = useState<Confirm>(null);

  if (!canWrite) return null;

  const setStatus = (status: "CANCELLED" | "SCHEDULED") =>
    save.mutate(
      { status },
      {
        onSuccess: () =>
          toast.success(status === "CANCELLED" ? `${workshop.code} was cancelled` : `${workshop.code} is open again`, {
            description:
              status === "CANCELLED"
                ? "Registration is closed. Existing registrations stay in the history."
                : "Registration is open again.",
          }),
        onError: (e) => toast.error(e.message),
      },
    );

  const doDelete = () =>
    remove.mutate(workshop.id, {
      onSuccess: () => {
        toast.success(`${workshop.code} was deleted`);
        if (variant === "page") router.push("/workshops");
      },
      onError: (e) => {
        if (isApiError(e, "WORKSHOP_HAS_REGISTRATIONS")) {
          toast.error("This workshop can't be deleted", {
            description: e.message,
            action:
              workshop.status === "SCHEDULED"
                ? { label: "Cancel workshop", onClick: () => setConfirm("cancel") }
                : undefined,
            duration: 10_000,
          });
        } else toast.error(e.message);
      },
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${workshop.code}`}
          className={cn(
            "press relative z-10 inline-flex items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-[#efeeeb] hover:text-[#111] focus-visible:ring-3 focus-visible:ring-ring/40 data-[popup-open]:bg-[#efeeeb] data-[popup-open]:text-[#111]",
            variant === "row" ? "size-8" : "h-9 gap-1.5 border border-[#e3e2df] bg-white px-3 text-sm text-[#2f3437]",
          )}
        >
          <DotsThree size={18} weight="bold" aria-hidden />
          {variant === "page" && "More"}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-52 rounded-xl border border-border p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0"
        >
          {variant === "row" && (
            <DropdownMenuItem className="px-2.5 py-2" onClick={() => router.push(`/workshops/${workshop.id}/edit`)}>
              <PencilSimple size={16} aria-hidden /> Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="px-2.5 py-2" onClick={() => router.push(`/workshops/new?from=${workshop.id}`)}>
            <Copy size={16} aria-hidden /> Duplicate
          </DropdownMenuItem>
          {workshop.status === "SCHEDULED" && (
            <DropdownMenuItem className="px-2.5 py-2" onClick={() => setConfirm("cancel")}>
              <Prohibit size={16} aria-hidden /> Cancel workshop
            </DropdownMenuItem>
          )}
          {workshop.status === "CANCELLED" && (
            <DropdownMenuItem className="px-2.5 py-2" onClick={() => setStatus("SCHEDULED")}>
              <ArrowCounterClockwise size={16} aria-hidden /> Reopen workshop
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" className="px-2.5 py-2" onClick={() => setConfirm("delete")}>
            <Trash size={16} aria-hidden /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-normal">
              {confirm === "cancel" ? `Cancel ${workshop.title}?` : `Delete ${workshop.title}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "cancel"
                ? workshop.activeCount > 0
                  ? `Registration closes. The ${workshop.activeCount} registered ${workshop.activeCount === 1 ? "person stays" : "people stay"} in the history, so you can contact them. You can reopen it later.`
                  : "Registration closes. You can reopen it later."
                : "This permanently removes the workshop. It's only possible if nobody has ever registered; otherwise, cancel it instead so the history is kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--pastel-red-fg)] text-white hover:bg-[#862826]"
              onClick={() => {
                if (confirm === "cancel") setStatus("CANCELLED");
                else doDelete();
                setConfirm(null);
              }}
            >
              {confirm === "cancel" ? "Cancel workshop" : "Delete workshop"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
