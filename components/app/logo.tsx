import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The mark: a row of three seats, the last one taken (amber). It's the
 * product in one glyph: every seat accounted for, none double-booked.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" fill={BRAND.ink} />
      <rect x="6.5" y="12" width="5" height="10" rx="1.6" fill={BRAND.paper} />
      <rect x="13.5" y="12" width="5" height="10" rx="1.6" fill={BRAND.paper} />
      <rect x="20.5" y="12" width="5" height="10" rx="1.6" fill="#d9a441" />
      <rect x="6" y="23.5" width="20" height="1.6" rx="0.8" fill={BRAND.paper} opacity="0.35" />
    </svg>
  );
}

/** Mark + wordmark. The wordmark uses the editorial serif. */
export function Logo({ className, subtitle = false }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[19px] text-[#111]">{BRAND.name}</span>
        {subtitle && (
          <span className="mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            {BRAND.organisation}
          </span>
        )}
      </span>
    </span>
  );
}
