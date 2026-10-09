import { cn } from "@/lib/utils";
import type { RegistrationStatus, Role, WorkshopStatus } from "@/lib/types";

type Tone = "red" | "blue" | "green" | "yellow" | "gray";

const TONE: Record<Tone, string> = {
  red: "bg-[var(--pastel-red)] text-[var(--pastel-red-fg)]",
  blue: "bg-[var(--pastel-blue)] text-[var(--pastel-blue-fg)]",
  green: "bg-[var(--pastel-green)] text-[var(--pastel-green-fg)]",
  yellow: "bg-[var(--pastel-yellow)] text-[var(--pastel-yellow-fg)]",
  gray: "bg-[var(--pastel-gray)] text-[var(--pastel-gray-fg)]",
};

/** Small uppercase pastel tag. Colour carries meaning, never decoration. */
export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-medium tracking-[0.05em] whitespace-nowrap uppercase",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const WORKSHOP_TONE: Record<WorkshopStatus, Tone> = { SCHEDULED: "blue", CANCELLED: "red", COMPLETED: "gray" };
export const StatusPill = ({ status }: { status: WorkshopStatus }) => (
  <Pill tone={WORKSHOP_TONE[status]}>{status.toLowerCase()}</Pill>
);

const REG_TONE: Record<RegistrationStatus, Tone> = { ACTIVE: "green", CANCELLED: "red", WAITLISTED: "yellow" };
const REG_LABEL: Record<RegistrationStatus, string> = { ACTIVE: "Registered", CANCELLED: "Cancelled", WAITLISTED: "Waitlist" };
export const RegistrationPill = ({ status }: { status: RegistrationStatus }) => (
  <Pill tone={REG_TONE[status]}>{REG_LABEL[status]}</Pill>
);

const ROLE_TONE: Record<Role, Tone> = { ADMIN: "yellow", MANAGER: "blue", STAFF: "gray" };
export const RolePill = ({ role }: { role: Role }) => <Pill tone={ROLE_TONE[role]}>{role.toLowerCase()}</Pill>;

/** "3 of 20 left" / "Last seat" / "Full", the answer staff look for first. */
export function SeatsPill({ seatsLeft, capacity, status }: { seatsLeft: number; capacity: number; status: WorkshopStatus }) {
  if (status !== "SCHEDULED") return <span className="text-sm text-muted-foreground">—</span>;
  if (seatsLeft <= 0) return <Pill tone="red">Full</Pill>;
  if (seatsLeft === 1) return <Pill tone="yellow">Last seat</Pill>;
  return (
    <Pill tone="green">
      {seatsLeft} of {capacity} left
    </Pill>
  );
}

/** Thin capacity meter. Width animates via transform only. */
export function SeatMeter({ used, capacity }: { used: number; capacity: number }) {
  const ratio = Math.min(used / capacity, 1);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--pastel-gray)]" aria-hidden>
      <div
        className={cn(
          "h-full w-full origin-left rounded-full transition-transform duration-300 ease-[var(--ease-out)]",
          ratio >= 1 ? "bg-[var(--pastel-red-fg)]" : ratio >= 0.85 ? "bg-[var(--pastel-yellow-fg)]" : "bg-[#2f3437]",
        )}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 font-mono text-xs text-muted-foreground">{eyebrow}</div>}
        <h1 className="font-display text-[2.25rem] text-[#111]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-input bg-white pr-8 pl-2.5 text-sm text-foreground transition-colors outline-none",
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 256 256%22><path fill=%22%23787774%22 d=%22M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z%22/></svg>')] bg-[length:12px] bg-[right_10px_center] bg-no-repeat",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#2f3437]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}


/** Bordered surface: 1px hairline, crisp radius, no shadow. */
export function Surface({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-border bg-white", className)} {...props} />;
}
