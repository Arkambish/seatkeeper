/**
 * Minimal fixed-window limiter for login attempts. In-memory, so it is
 * per-instance; a multi-instance deployment would back this with Redis.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export function clearAttempts(key: string) {
  hits.delete(key);
}
