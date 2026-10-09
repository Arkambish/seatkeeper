"use client";

import { ChangePasswordDialog } from "./change-password-dialog";

/**
 * Shown instead of the page while the user still has an admin-issued
 * temporary password. The API enforces the same rule (403 on everything
 * except changing the password), so this is not just a UI gate.
 */
export function FirstLoginGate() {
  return (
    <>
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center" aria-hidden>
        <p className="font-display text-2xl text-[#111]">Welcome</p>
        <p className="max-w-sm text-sm text-muted-foreground">Set your own password to get started.</p>
      </div>
      <ChangePasswordDialog open required />
    </>
  );
}
