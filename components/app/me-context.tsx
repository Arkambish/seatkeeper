"use client";

import { createContext, useContext } from "react";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Me } from "@/lib/types";

const MeContext = createContext<Me | null>(null);

export function MeProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside <MeProvider>");
  return me;
}

/** UI hint only. The API enforces the same rule. */
export function useCan(permission: Permission) {
  return can(useMe().role, permission);
}
