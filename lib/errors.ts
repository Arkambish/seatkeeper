import { Prisma } from "@prisma/client";

/** Stable, machine-readable error codes. The UI branches on these, never on messages. */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "WORKSHOP_FULL"
  | "WORKSHOP_NOT_OPEN"
  | "WORKSHOP_HAS_SEATS"
  | "ALREADY_REGISTERED"
  | "ALREADY_CANCELLED"
  | "CAPACITY_BELOW_REGISTERED"
  | "DUPLICATE"
  | "CONFLICT"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  INVALID_CREDENTIALS: 401,
  RATE_LIMITED: 429,
  WORKSHOP_FULL: 409,
  WORKSHOP_NOT_OPEN: 409,
  WORKSHOP_HAS_SEATS: 409,
  ALREADY_REGISTERED: 409,
  ALREADY_CANCELLED: 409,
  CAPACITY_BELOW_REGISTERED: 409,
  DUPLICATE: 409,
  CONFLICT: 409,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

/**
 * Postgres SQLSTATE of a failed Prisma call, whether it came from the query
 * builder (P2002 etc.) or from `$queryRaw` (P2010 wraps the raw driver error).
 */
export function pgErrorCode(e: unknown): string | undefined {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  if (e.code === "P2002") return "23505";
  const meta = e.meta as { code?: string } | undefined;
  return meta?.code;
}

export const isUniqueViolation = (e: unknown) => pgErrorCode(e) === "23505";
