"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, MapPin, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { Pagination, useClientPagination } from "@/components/app/pagination";
import { PageHeader, Surface } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { useDeleteLocation, useLocations, useSaveLocation } from "@/hooks/queries";
import { isApiError } from "@/lib/query/api";
import type { Location } from "@/lib/types";
import { locationSchema, type LocationInput } from "@/lib/validation/locations";

/** Managers maintain the centre's locations used by workshops. */
export function LocationsView() {
  const { data: locations = [] } = useLocations();
  const remove = useDeleteLocation();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const pager = useClientPagination(locations, "all");

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Catalogue"
        title="Locations"
        description="The places workshops are held. A location can be deleted only while no workshop uses it; otherwise rename it."
      />

      <Surface className="mb-6 p-4 sm:p-5">
        <LocationForm />
      </Surface>

      <Surface className="overflow-hidden">
        {locations.length === 0 ? (
          <EmptyState
            icon={<MapPin size={22} weight="bold" />}
            title="No locations yet"
            description="Add the centre's first location above, then schedule workshops there."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-3 font-normal sm:px-5">Name</th>
                <th className="px-5 py-3 font-normal max-sm:hidden">Workshops</th>
                <th className="px-4 py-3 sm:px-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pager.pageItems.map((l) =>
                editing === l.id ? (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td colSpan={3} className="px-4 py-3 sm:px-5">
                      <LocationForm location={l} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-start gap-2 text-[#111]">
                        <MapPin size={15} className="mt-0.75 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          {l.name}
                          {/* On phones the count moves under the name instead of its own column. */}
                          <span className="block text-xs text-muted-foreground sm:hidden">
                            <WorkshopCount location={l} />
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums max-sm:hidden">
                      <WorkshopCount location={l} />
                    </td>
                    <td className="py-2 pr-2 pl-0 text-right whitespace-nowrap sm:px-5 sm:py-3">
                      <button
                        type="button"
                        onClick={() => setEditing(l.id)}
                        aria-label={`Rename ${l.name}`}
                        className="press inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111] max-sm:size-10 max-sm:justify-center max-sm:px-0"
                      >
                        <PencilSimple size={14} aria-hidden className="max-sm:size-4.5" />
                        <span className="max-sm:hidden">Rename</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(l)}
                        disabled={!!l.workshopCount}
                        aria-label={`Delete ${l.name}`}
                        title={l.workshopCount ? "In use by workshops, so it can't be deleted" : undefined}
                        className="press inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-[var(--pastel-red-fg)] hover:bg-[var(--pastel-red)] disabled:pointer-events-none disabled:opacity-35 max-sm:size-10 max-sm:justify-center max-sm:px-0"
                      >
                        <Trash size={14} aria-hidden className="max-sm:size-4.5" />
                        <span className="max-sm:hidden">Delete</span>
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </Surface>

      <Pagination
        className="mt-5"
        page={pager.page}
        pageSize={pager.pageSize}
        total={pager.total}
        noun={pager.total === 1 ? "location" : "locations"}
        onPageChange={pager.setPage}
        onPageSizeChange={pager.setPageSize}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl font-normal">Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It isn&apos;t used by any workshop, so nothing else is affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--pastel-red-fg)] text-white hover:bg-[#862826]"
              onClick={() => {
                const l = deleting!;
                setDeleting(null);
                remove.mutate(l.id, {
                  onSuccess: () => toast.success(`${l.name} was deleted`),
                  onError: (e) => toast.error(e.message),
                });
              }}
            >
              Delete location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Add (no `location`) or inline-rename (with `location`). */
function LocationForm({ location, onDone }: { location?: Location; onDone?: () => void }) {
  const save = useSaveLocation();
  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: location?.name ?? "" },
  });
  const error = form.formState.errors.name?.message;

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(
      { id: location?.id, ...values },
      {
        onSuccess: (l) => {
          toast.success(location ? `Renamed to ${l.name}` : `${l.name} added`);
          form.reset({ name: location ? l.name : "" });
          onDone?.();
        },
        onError: (e) => {
          if (isApiError(e) && e.fields?.name) form.setError("name", { message: e.fields.name[0] });
          else toast.error(e.message);
        },
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1.5">
      {/* Adding stacks on phones so the hint isn't truncated; renaming stays on one row. */}
      <div className={cn("flex gap-2", location ? "items-center" : "flex-col sm:flex-row sm:items-center")}>
        <Input
          {...form.register("name")}
          autoFocus={!!location}
          placeholder={location ? undefined : "New location, e.g. Kandy Road Studio"}
          aria-label={location ? `New name for ${location.name}` : "New location name"}
          aria-invalid={!!error}
          className="h-9 bg-white sm:max-w-sm"
          onKeyDown={(e) => {
            if (e.key === "Escape" && onDone) onDone();
          }}
        />
        {location ? (
          <>
            <Button type="submit" size="icon" aria-label="Save name" disabled={save.isPending}>
              <Check weight="bold" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Cancel rename" onClick={onDone}>
              <X weight="bold" />
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={save.isPending}>
            <Plus weight="bold" /> Add location
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function WorkshopCount({ location: l }: { location: Location }) {
  if (!l.workshopCount) return <>Not used yet</>;
  return (
    <Link href={`/workshops?range=all&locationId=${l.id}`} className="underline-offset-4 hover:text-[#111] hover:underline">
      {l.workshopCount} {l.workshopCount === 1 ? "workshop" : "workshops"}
    </Link>
  );
}
