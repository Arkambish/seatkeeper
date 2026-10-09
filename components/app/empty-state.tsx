import { cn } from "@/lib/utils";

/**
 * One empty / error state for every list: a quiet icon, a serif title, one
 * line of plain guidance, and (optionally) the action that gets you unstuck.
 * Server-safe: pass a rendered icon element, not a component.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "neutral",
  size = "md",
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "neutral" | "error";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "fade-in flex flex-col items-center justify-center text-center",
        size === "md" ? "gap-3 px-6 py-16" : "gap-2 px-6 py-10",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className={cn(
            "mb-1 flex items-center justify-center rounded-xl border",
            size === "md" ? "size-12" : "size-10",
            tone === "error"
              ? "border-[var(--pastel-red-fg)]/15 bg-[var(--pastel-red)] text-[var(--pastel-red-fg)]"
              : "border-border bg-[#f7f6f3] text-[#787774]",
          )}
        >
          {icon}
        </span>
      )}
      <p className={cn("font-display text-[#111]", size === "md" ? "text-xl" : "text-lg")}>{title}</p>
      {description && <div className="max-w-sm text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}
