"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarBlank, CaretDown, ClockCounterClockwise, Key, MapPin, SignOut, UsersThree } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { can, homePathFor } from "@/lib/auth/permissions";
import { apiFetch } from "@/lib/query/api";
import { APP_TIMEZONE } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ChangePasswordDialog } from "./change-password-dialog";
import { HeaderFrame } from "./header-frame";
import { useMe } from "./me-context";
import { RolePill } from "./ui";

type NavLink = { href: string; label: string; icon: Icon };

export function AppNav() {
  const me = useMe();
  const pathname = usePathname();

  const links = [
    can(me.role, "workshops:read") && { href: "/workshops", label: "Workshops", icon: CalendarBlank },
    can(me.role, "workshops:write") && { href: "/locations", label: "Locations", icon: MapPin },
    can(me.role, "users:manage") && { href: "/users", label: "Accounts", icon: UsersThree },
    can(me.role, "users:manage") && { href: "/activity", label: "Activity", icon: ClockCounterClockwise },
  ].filter(Boolean) as NavLink[];

  return (
    <HeaderFrame
      homeHref={homePathFor(me.role)}
      nav={
        <nav aria-label="Main" className="flex h-full items-stretch gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 text-sm transition-colors",
                  "after:absolute after:inset-x-2.5 after:-bottom-px after:h-[2px] after:rounded-full after:transition-colors",
                  active ? "text-[#111] after:bg-[#111]" : "text-muted-foreground after:bg-transparent hover:text-[#111]",
                )}
              >
                <l.icon size={16} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="max-sm:sr-only">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      }
      actions={
        <>
          <Today />
          <AccountMenu />
        </>
      }
    />
  );
}

/** Today's date in the centre's timezone. Handy when taking bookings by phone. */
function Today() {
  const [label] = useState(() =>
    new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE }).format(
      new Date(),
    ),
  );
  return (
    <span suppressHydrationWarning className="hidden font-mono text-xs text-muted-foreground md:inline">
      {label}
    </span>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

function AccountMenu() {
  const me = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const [changing, setChanging] = useState(false);

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="press flex items-center gap-2 rounded-lg border border-transparent py-1 pr-1.5 pl-1 text-left outline-none hover:border-border hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/40 data-[popup-open]:border-border data-[popup-open]:bg-white"
        aria-label={`Account: ${me.name}`}
      >
        <span className="flex size-8 items-center justify-center rounded-md bg-[#efeeeb] font-mono text-xs font-medium text-[#2f3437]">
          {initials(me.name)}
        </span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="text-[13px] text-[#111]">{me.name}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{me.role.toLowerCase()}</span>
        </span>
        <CaretDown size={12} weight="bold" className="text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-xl border border-border p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.06)] ring-0"
      >
        <div className="px-2.5 pt-2 pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-[#111]">{me.name}</span>
            <RolePill role={me.role} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{me.email}</div>
        </div>
        <DropdownMenuSeparator />
        {!me.mustChangePassword && (
          <DropdownMenuItem onClick={() => setChanging(true)} className="mt-1 px-2.5 py-2">
            <Key size={16} weight="bold" aria-hidden />
            Change password
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={signOut} className="px-2.5 py-2">
          <SignOut size={16} weight="bold" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ChangePasswordDialog open={changing} onClose={() => setChanging(false)} />
    </DropdownMenu>
  );
}
