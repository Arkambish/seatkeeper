/**
 * Query-key factory. Keys are hierarchical so invalidation can be as broad
 * (`workshops.all`) or as narrow (`workshops.detail(id)`) as a mutation needs.
 */
export const qk = {
  workshops: {
    all: ["workshops"] as const,
    lists: () => [...qk.workshops.all, "list"] as const,
    list: (params: Record<string, string>) => [...qk.workshops.lists(), params] as const,
    detail: (id: string) => [...qk.workshops.all, "detail", id] as const,
    registrations: (id: string) => [...qk.workshops.all, "registrations", id] as const,
    history: (id: string) => [...qk.workshops.all, "history", id] as const,
  },
  locations: ["locations"] as const,
  users: { all: ["users"] as const, history: ["users", "history"] as const },
};
