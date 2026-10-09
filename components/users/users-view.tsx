"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/components/app/me-context";
import { NativeSelect, PageHeader, Pill, Surface } from "@/components/app/ui";
import { useUpdateUser, useUsers } from "@/hooks/queries";
import { formatDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/lib/types";

// Dialogs are only needed after a click, so keep them out of the first bundle.
const CreateUserDialog = dynamic(() => import("./user-dialogs").then((m) => m.CreateUserDialog));
const ResetPasswordDialog = dynamic(() => import("./user-dialogs").then((m) => m.ResetPasswordDialog));

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Manages accounts only",
  MANAGER: "Schedules workshops, registers attendees",
  STAFF: "Registers and cancels attendees",
};

export function UsersView() {
  const me = useMe();
  const { data: users = [] } = useUsers();
  const update = useUpdateUser();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);

  const change = (u: User, patch: { role?: Role; isActive?: boolean }, message: string) =>
    update.mutate({ id: u.id, ...patch }, { onSuccess: () => toast.success(message), onError: (e) => toast.error(e.message) });

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Accounts"
        description="Create staff accounts and set what each person can do. Role changes and deactivation take effect immediately: the person is signed out."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus weight="bold" /> New account
          </Button>
        }
      />

      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-normal">Person</th>
                <th className="px-5 py-3 font-normal">Role</th>
                <th className="px-5 py-3 font-normal">Active</th>
                <th className="px-5 py-3 font-normal">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className={cn("border-b border-border last:border-0", !u.isActive && "text-muted-foreground")}>
                    <td className="px-5 py-3.5">
                      <div className={cn(u.isActive ? "text-[#111]" : "text-muted-foreground")}>
                        {u.name} {self && <Pill tone="gray" className="ml-1">You</Pill>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <NativeSelect
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={self}
                        title={self ? "You can't change your own role" : ROLE_HELP[u.role]}
                        onChange={(e) => change(u, { role: e.target.value as Role }, `${u.name} is now ${e.target.value.toLowerCase()}`)}
                        className="h-8"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">Staff</option>
                      </NativeSelect>
                      <div className="mt-1 text-[11px] text-muted-foreground">{ROLE_HELP[u.role]}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Switch
                        checked={u.isActive}
                        disabled={self}
                        aria-label={`${u.isActive ? "Deactivate" : "Activate"} ${u.name}`}
                        onCheckedChange={(v) => change(u, { isActive: v }, v ? `${u.name} can sign in again` : `${u.name} was deactivated`)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setResetting(u)}
                        className="press rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-[#efeeeb] hover:text-[#111]"
                      >
                        Reset password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>

      {creating && <CreateUserDialog onClose={() => setCreating(false)} />}
      {resetting && <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}
