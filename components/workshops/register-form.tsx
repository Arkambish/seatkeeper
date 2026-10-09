"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/app/ui";
import { useRegisterAttendee } from "@/hooks/queries";
import { isApiError } from "@/lib/query/api";
import type { Me } from "@/lib/types";
import { registerAttendeeSchema } from "@/lib/validation/registrations";

const formSchema = registerAttendeeSchema.pick({ attendeeName: true, attendeeEmail: true });
type FormValues = z.infer<typeof formSchema>;

export function RegisterForm({ workshopId, full, me }: { workshopId: string; full: boolean; me: Me }) {
  const register = useRegisterAttendee(workshopId, me);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { attendeeName: "", attendeeEmail: "" } });
  const { errors } = form.formState;

  const submit = (values: FormValues, waitlist: boolean) => {
    // Clear right away so the next caller can be typed in while this one saves.
    form.reset();
    form.setFocus("attendeeName");
    register.mutate(
      { ...values, waitlist },
      {
        onSuccess: (r) =>
          toast.success(
            r.status === "WAITLISTED" ? `${r.attendeeName} added to the waitlist` : `${r.attendeeName} is registered`,
          ),
        onError: (e) => {
          // Give the typed details back, unless they've started on the next caller.
          const current = form.getValues();
          if (!current.attendeeName && !current.attendeeEmail) form.reset(values);
          if (isApiError(e, "WORKSHOP_FULL")) {
            toast.error("That was the last seat. Someone else just took it.", {
              description: "You can add them to the waitlist instead.",
              action: { label: "Add to waitlist", onClick: () => submit(values, true) },
              duration: 10_000,
            });
          } else if (isApiError(e, "ALREADY_REGISTERED")) {
            form.setError("attendeeEmail", { message: "Already registered for this workshop" });
          } else if (isApiError(e, "WORKSHOP_HAS_SEATS")) {
            toast.info("A seat just opened up, so they can be registered directly.");
          } else if (isApiError(e) && e.fields) {
            for (const [k, msgs] of Object.entries(e.fields)) form.setError(k as keyof FormValues, { message: msgs[0] });
          } else {
            toast.error(e.message);
          }
        },
      },
    );
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((v) => submit(v, full))}
      className="flex flex-col gap-4 md:flex-row md:items-start"
    >
      <div className="md:w-56 md:shrink-0">
        <h2 className="font-display text-xl text-[#111]">{full ? "Join the waitlist" : "Register an attendee"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {full ? "The workshop is full. The next freed seat goes to the first person waiting." : "Name and email, as given on the phone or at the desk."}
        </p>
      </div>
      <Field label="Full name" htmlFor="attendeeName" error={errors.attendeeName?.message} className="flex-1">
        <Input id="attendeeName" autoComplete="off" className="h-9 bg-white" aria-invalid={!!errors.attendeeName} {...form.register("attendeeName")} />
      </Field>
      <Field label="Email" htmlFor="attendeeEmail" error={errors.attendeeEmail?.message} className="flex-1">
        <Input id="attendeeEmail" type="email" autoComplete="off" className="h-9 bg-white" aria-invalid={!!errors.attendeeEmail} {...form.register("attendeeEmail")} />
      </Field>
      <Button type="submit" className="md:mt-[26px]" variant={full ? "outline" : "default"}>
        {full ? "Add to waitlist" : "Register"}
      </Button>
    </form>
  );
}
