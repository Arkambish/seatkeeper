"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/query/api";
import { qk } from "@/lib/query/keys";
import type {
  AuditEntry,
  Location,
  Me,
  Page,
  Registration,
  User,
  Workshop,
  WorkshopDetail,
} from "@/lib/types";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validation/users";
import type { CreateWorkshopInput, UpdateWorkshopInput } from "@/lib/validation/workshops";

const LIVE_MS = 15_000; // seat counts refresh while the page is visible

// ---------------------------------------------------------------- queries

export function useWorkshops(params: Record<string, string>) {
  return useInfiniteQuery({
    queryKey: qk.workshops.list(params),
    queryFn: ({ pageParam, signal }) =>
      apiFetch<Page<Workshop>>("/api/workshops", { query: { ...params, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Keep showing the previous results while a new filter loads (no flash).
    placeholderData: keepPreviousData,
  });
}

export const workshopDetailQuery = (id: string) => ({
  queryKey: qk.workshops.detail(id),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    apiFetch<WorkshopDetail>(`/api/workshops/${id}`, { signal }),
});

export const registrationsQuery = (id: string) => ({
  queryKey: qk.workshops.registrations(id),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    apiFetch<Registration[]>(`/api/workshops/${id}/registrations`, { signal }),
});

export const useWorkshop = (id: string) => useQuery({ ...workshopDetailQuery(id), refetchInterval: LIVE_MS });

export const useRegistrations = (id: string) =>
  useQuery({ ...registrationsQuery(id), refetchInterval: LIVE_MS });

/** Warm the cache on hover/focus so opening a workshop feels instant. */
export function usePrefetchWorkshop() {
  const qc = useQueryClient();
  return (id: string) => {
    void qc.prefetchQuery(workshopDetailQuery(id));
    void qc.prefetchQuery(registrationsQuery(id));
  };
}

export const useLocations = () =>
  useQuery({
    queryKey: qk.locations,
    queryFn: ({ signal }) => apiFetch<Location[]>("/api/locations", { signal }),
    staleTime: Infinity, // three rows that practically never change
  });

export const useWorkshopHistory = (id: string) =>
  useQuery({
    queryKey: qk.workshops.history(id),
    queryFn: ({ signal }) =>
      apiFetch<Page<AuditEntry>>("/api/audit-logs", { query: { entityType: "workshop", entityId: id }, signal }),
  });

export const useUsers = () =>
  useQuery({ queryKey: qk.users.all, queryFn: ({ signal }) => apiFetch<User[]>("/api/users", { signal }) });

export const useAccountHistory = () =>
  useInfiniteQuery({
    queryKey: qk.users.history,
    queryFn: ({ pageParam, signal }) =>
      apiFetch<Page<AuditEntry>>("/api/audit-logs", { query: { entityType: "user", cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

// -------------------------------------------------------------- mutations

type RegisterVars = { attendeeName: string; attendeeEmail: string; waitlist?: boolean };

/**
 * Optimistic: the seat counter and the new row update instantly. The server is
 * still the judge. If it says the workshop filled up meanwhile, we roll back.
 */
export function useRegisterAttendee(workshopId: string, me: Me) {
  const qc = useQueryClient();
  const detailKey = qk.workshops.detail(workshopId);
  const regsKey = qk.workshops.registrations(workshopId);

  return useMutation({
    mutationFn: (vars: RegisterVars) =>
      apiFetch<Registration>(`/api/workshops/${workshopId}/registrations`, { method: "POST", body: vars }),

    onMutate: async (vars) => {
      await Promise.all([qc.cancelQueries({ queryKey: detailKey }), qc.cancelQueries({ queryKey: regsKey })]);
      const prev = {
        detail: qc.getQueryData<WorkshopDetail>(detailKey),
        regs: qc.getQueryData<Registration[]>(regsKey),
      };
      const tempId = `optimistic-${crypto.randomUUID()}`;
      const status = vars.waitlist ? "WAITLISTED" : "ACTIVE";

      qc.setQueryData<WorkshopDetail>(detailKey, (w) =>
        !w
          ? w
          : vars.waitlist
            ? { ...w, waitlistCount: w.waitlistCount + 1 }
            : { ...w, activeCount: w.activeCount + 1, seatsLeft: Math.max(w.seatsLeft - 1, 0) },
      );
      qc.setQueryData<Registration[]>(regsKey, (rows = []) => [
        {
          id: tempId,
          workshopId,
          attendeeName: vars.attendeeName,
          attendeeEmail: vars.attendeeEmail.toLowerCase(),
          status,
          registeredAt: new Date().toISOString(),
          registeredBy: { id: me.id, name: me.name },
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null,
          promotedAt: null,
        },
        ...rows,
      ]);
      return { prev, tempId };
    },

    onSuccess: (created, _vars, ctx) => {
      qc.setQueryData<Registration[]>(regsKey, (rows = []) =>
        rows.map((r) => (r.id === ctx?.tempId ? created : r)),
      );
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev.detail) qc.setQueryData(detailKey, ctx.prev.detail);
      if (ctx?.prev.regs) qc.setQueryData(regsKey, ctx.prev.regs);
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: detailKey });
      void qc.invalidateQueries({ queryKey: regsKey });
      void qc.invalidateQueries({ queryKey: qk.workshops.lists() });
    },
  });
}

export function useCancelRegistration(workshopId: string, me: Me) {
  const qc = useQueryClient();
  const detailKey = qk.workshops.detail(workshopId);
  const regsKey = qk.workshops.registrations(workshopId);

  return useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      apiFetch<{ workshopId: string; promoted: number }>(`/api/registrations/${vars.id}/cancel`, {
        method: "POST",
        body: { reason: vars.reason || undefined },
      }),

    onMutate: async ({ id, reason }) => {
      await Promise.all([qc.cancelQueries({ queryKey: detailKey }), qc.cancelQueries({ queryKey: regsKey })]);
      const prev = {
        detail: qc.getQueryData<WorkshopDetail>(detailKey),
        regs: qc.getQueryData<Registration[]>(regsKey),
      };
      const target = prev.regs?.find((r) => r.id === id);

      qc.setQueryData<Registration[]>(regsKey, (rows = []) =>
        rows.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "CANCELLED",
                cancelledAt: new Date().toISOString(),
                cancelledBy: { id: me.id, name: me.name },
                cancelReason: reason || null,
              }
            : r,
        ),
      );
      if (target) {
        qc.setQueryData<WorkshopDetail>(detailKey, (w) =>
          !w
            ? w
            : target.status === "ACTIVE"
              ? { ...w, activeCount: w.activeCount - 1, seatsLeft: w.seatsLeft + 1 }
              : { ...w, waitlistCount: Math.max(w.waitlistCount - 1, 0) },
        );
      }
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev.detail) qc.setQueryData(detailKey, ctx.prev.detail);
      if (ctx?.prev.regs) qc.setQueryData(regsKey, ctx.prev.regs);
    },

    onSettled: () => {
      void qc.invalidateQueries({ queryKey: detailKey });
      void qc.invalidateQueries({ queryKey: regsKey });
      void qc.invalidateQueries({ queryKey: qk.workshops.lists() });
    },
  });
}

export function useSaveWorkshop(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkshopInput | UpdateWorkshopInput) =>
      id
        ? apiFetch<WorkshopDetail>(`/api/workshops/${id}`, { method: "PATCH", body })
        : apiFetch<WorkshopDetail>("/api/workshops", { method: "POST", body }),
    onSuccess: (saved) => {
      // Seed the detail cache so the page we navigate to renders instantly.
      qc.setQueryData(qk.workshops.detail(saved.id), saved);
      void qc.invalidateQueries({ queryKey: qk.workshops.lists() });
      void qc.invalidateQueries({ queryKey: qk.workshops.history(saved.id) });
      void qc.invalidateQueries({ queryKey: qk.workshops.registrations(saved.id) });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserInput) => apiFetch<User>("/api/users", { method: "POST", body }),
    onSuccess: (user) => {
      qc.setQueryData<User[]>(qk.users.all, (rows = []) => [...rows, user]);
      void qc.invalidateQueries({ queryKey: qk.users.all });
      void qc.invalidateQueries({ queryKey: qk.users.history });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateUserInput & { id: string }) =>
      apiFetch<User>(`/api/users/${id}`, { method: "PATCH", body }),
    onMutate: async ({ id, password: _pw, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.users.all });
      const prev = qc.getQueryData<User[]>(qk.users.all);
      qc.setQueryData<User[]>(qk.users.all, (rows = []) => rows.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.users.all, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.users.all });
      void qc.invalidateQueries({ queryKey: qk.users.history });
    },
  });
}
