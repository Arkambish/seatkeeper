"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { isApiError } from "@/lib/query/api";
import { getQueryClient } from "@/lib/query/client";

// A revoked session (e.g. role changed by an admin) sends the user to sign in.
function onAuthError(err: unknown) {
  if (isApiError(err, "UNAUTHENTICATED") && window.location.pathname !== "/login") {
    // A full reload on purpose: it drops every cached query of the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc = getQueryClient();
    qc.getQueryCache().config.onError = onAuthError;
    qc.getMutationCache().config.onError = onAuthError;
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}

