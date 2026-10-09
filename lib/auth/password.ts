import bcrypt from "bcryptjs";

const COST = 12;

// Compared against when the email is unknown, so a login attempt takes the
// same time whether or not the account exists (no user enumeration by timing).
// Precomputed so it costs nothing at cold start.
const DUMMY_HASH = "$2b$12$gPgSaR5A.qqoEb9FhsgVtuFVarlSq0XOYl6l3wkW.s2ypelDIbCgi";

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

export async function verifyPassword(plain: string, hash: string | null | undefined) {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return ok && Boolean(hash);
}
