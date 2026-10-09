// Wire types shared by the API, the services and the client. Dates are ISO
// strings so server-prefetched data and client-fetched data are identical
// (important for TanStack Query hydration).

import type { REGISTRATION_STATUSES, ROLES, WORKSHOP_STATUSES } from "@/lib/validation/common";

export type Role = (typeof ROLES)[number];
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export type UserRef = { id: string; name: string };

export type Me = { id: string; name: string; email: string; role: Role; mustChangePassword: boolean };

export type Location = { id: string; name: string };

export type Workshop = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  instructor: string;
  location: Location;
  startsAt: string;
  endsAt: string;
  capacity: number;
  activeCount: number;
  seatsLeft: number;
  status: WorkshopStatus;
  updatedAt: string;
};

export type WorkshopDetail = Workshop & {
  waitlistCount: number;
  createdBy: UserRef;
  updatedBy: UserRef;
  createdAt: string;
};

export type Registration = {
  id: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: RegistrationStatus;
  registeredAt: string;
  registeredBy: UserRef;
  cancelledAt: string | null;
  cancelledBy: UserRef | null;
  cancelReason: string | null;
  promotedAt: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  /** Still on the temporary password an admin set. */
  mustChangePassword: boolean;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: "user" | "workshop";
  entityId: string;
  actor: UserRef;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string[]> };
};
