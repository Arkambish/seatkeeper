import { cn } from "@/lib/utils";

/** Public wording for availability. Plain words, colour only as reinforcement. */
export function SeatStatus({ seatsLeft, className }: { seatsLeft: number; className?: string }) {
  const [label, tone] =
    seatsLeft <= 0
      ? ["Full, waitlist open", "text-[var(--pastel-red-fg)] bg-[var(--pastel-red)]"]
      : seatsLeft === 1
        ? ["Last seat", "text-[var(--pastel-yellow-fg)] bg-[var(--pastel-yellow)]"]
        : seatsLeft <= 3
          ? [`${seatsLeft} seats left`, "text-[var(--pastel-yellow-fg)] bg-[var(--pastel-yellow)]"]
          : [`${seatsLeft} seats left`, "text-[var(--pastel-green-fg)] bg-[var(--pastel-green)]"];
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium tabular-nums", tone, className)}>
      {label}
    </span>
  );
}
