import { z } from "zod";

/**
 * Server-side environment, validated once at module load so a missing or
 * malformed variable fails fast with a readable message instead of a
 * confusing runtime error deep inside a request.
 */
const schema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export const env = schema.parse(process.env);
