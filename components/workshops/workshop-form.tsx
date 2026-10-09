"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect, Surface } from "@/components/app/ui";
import { useLocations, useSaveWorkshop } from "@/hooks/queries";
import { isApiError } from "@/lib/query/api";
import { fromLocalInput, toLocalInput } from "@/lib/time";
import type { WorkshopDetail } from "@/lib/types";
import { workshopStatusSchema } from "@/lib/validation/common";

// Same rules as the API schema, but with local date-time strings from the inputs.
const formSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, "2–30 letters, digits or dashes"),
    title: z.string().trim().min(1, "Title is required").max(160),
    description: z.string().trim().max(2000),
    instructor: z.string().trim().min(1, "Instructor is required").max(120),
    locationId: z.string().min(1, "Choose a location"),
    startsAt: z.string().min(1, "Start is required"),
    endsAt: z.string().min(1, "End is required"),
    capacity: z.coerce.number({ invalid_type_error: "Enter a number" }).int().min(1, "At least 1 seat").max(1000),
    status: workshopStatusSchema,
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, { message: "End must be after start", path: ["endsAt"] });

type FormValues = z.input<typeof formSchema>;
type Parsed = z.output<typeof formSchema>;

function defaults(w?: WorkshopDetail): FormValues {
  if (w) {
    return {
      code: w.code,
      title: w.title,
      description: w.description ?? "",
      instructor: w.instructor,
      locationId: w.location.id,
      startsAt: toLocalInput(w.startsAt),
      endsAt: toLocalInput(w.endsAt),
      capacity: w.capacity,
      status: w.status,
    };
  }
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return {
    code: "",
    title: "",
    description: "",
    instructor: "",
    locationId: "",
    startsAt: `${tomorrow}T10:00`,
    endsAt: `${tomorrow}T12:00`,
    capacity: 12,
    status: "SCHEDULED",
  };
}

const toApi = (v: Parsed) => ({
  ...v,
  description: v.description || null,
  startsAt: fromLocalInput(v.startsAt),
  endsAt: fromLocalInput(v.endsAt),
});

export function WorkshopForm({ workshop }: { workshop?: WorkshopDetail }) {
  const router = useRouter();
  const save = useSaveWorkshop(workshop?.id);
  const { data: locations = [] } = useLocations();
  const form = useForm<FormValues, unknown, Parsed>({ resolver: zodResolver(formSchema), defaultValues: defaults(workshop) });
  const { errors, dirtyFields, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    const full = toApi(values);
    // On edit, send only what changed, so the audit trail records just that.
    const body = workshop
      ? Object.fromEntries(Object.entries(full).filter(([k]) => dirtyFields[k as keyof FormValues]))
      : full;

    try {
      const saved = await save.mutateAsync(body);
      toast.success(workshop ? "Workshop updated" : "Workshop created");
      router.push(`/workshops/${saved.id}`);
    } catch (e) {
      if (isApiError(e) && e.fields) {
        for (const [k, msgs] of Object.entries(e.fields)) form.setError(k as keyof FormValues, { message: msgs[0] });
      }
      toast.error(e instanceof Error ? e.message : "Couldn't save the workshop.");
    }
  });

  const err = (k: keyof FormValues) => errors[k]?.message;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Surface className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-6 md:p-8">
        <Field label="Code" htmlFor="code" error={err("code")} hint="e.g. POT-101" className="md:col-span-2">
          <Input id="code" className="bg-white font-mono uppercase" aria-invalid={!!errors.code} {...form.register("code")} />
        </Field>
        <Field label="Title" htmlFor="title" error={err("title")} className="md:col-span-4">
          <Input id="title" className="bg-white" aria-invalid={!!errors.title} {...form.register("title")} />
        </Field>
        <Field label="Instructor" htmlFor="instructor" error={err("instructor")} className="md:col-span-3">
          <Input id="instructor" className="bg-white" aria-invalid={!!errors.instructor} {...form.register("instructor")} />
        </Field>
        <Field label="Location" htmlFor="locationId" error={err("locationId")} className="md:col-span-3">
          <NativeSelect id="locationId" className="w-full" aria-invalid={!!errors.locationId} {...form.register("locationId")}>
            <option value="" disabled>
              Choose a location
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Starts" htmlFor="startsAt" error={err("startsAt")} className="md:col-span-2">
          <Input id="startsAt" type="datetime-local" className="bg-white" aria-invalid={!!errors.startsAt} {...form.register("startsAt")} />
        </Field>
        <Field label="Ends" htmlFor="endsAt" error={err("endsAt")} className="md:col-span-2">
          <Input id="endsAt" type="datetime-local" className="bg-white" aria-invalid={!!errors.endsAt} {...form.register("endsAt")} />
        </Field>
        <Field
          label="Capacity (seats)"
          htmlFor="capacity"
          error={err("capacity")}
          hint={workshop ? `${workshop.activeCount} currently registered` : undefined}
          className="md:col-span-1"
        >
          <Input id="capacity" type="number" min={1} inputMode="numeric" className="bg-white tabular-nums" aria-invalid={!!errors.capacity} {...form.register("capacity")} />
        </Field>
        <Field label="Status" htmlFor="status" error={err("status")} className="md:col-span-1">
          <NativeSelect id="status" className="w-full" {...form.register("status")}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </NativeSelect>
        </Field>
        <Field label="Description" htmlFor="description" error={err("description")} hint="Optional. What to bring, who it's for." className="md:col-span-6">
          <Textarea id="description" rows={3} className="bg-white" {...form.register("description")} />
        </Field>
      </Surface>

      <div className="mt-6 flex items-center justify-end gap-2">
        <Link href={workshop ? `/workshops/${workshop.id}` : "/workshops"} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={save.isPending || (!!workshop && !isDirty)}>
          {save.isPending ? "Saving…" : workshop ? "Save changes" : "Create workshop"}
        </Button>
      </div>
    </form>
  );
}
