import { AppError } from "@/lib/errors";

/**
 * Opaque keyset cursor: (sort timestamp, id). Keyset pagination stays fast at
 * any depth (no OFFSET scan) and is stable while rows are inserted.
 */
export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(JSON.stringify([at.toISOString(), id])).toString("base64url");
}

export function decodeCursor(cursor: string): { at: Date; id: string } {
  try {
    const [at, id] = JSON.parse(Buffer.from(cursor, "base64url").toString()) as [string, string];
    const date = new Date(at);
    if (Number.isNaN(date.getTime()) || typeof id !== "string") throw new Error();
    return { at: date, id };
  } catch {
    throw new AppError("VALIDATION_FAILED", "Invalid cursor.");
  }
}
