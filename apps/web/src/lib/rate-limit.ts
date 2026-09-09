import "server-only";

/**
 * In-memory fixed-window rate limiter for auth endpoints (login, register,
 * forgot-password, reset-password). Deliberately dependency-free so Phase 1
 * needs no Redis to enforce this baseline.
 *
 * Known limitation, documented rather than hidden: this resets on process
 * restart and does not share state across multiple server instances. That's
 * fine for a single Vercel/Render instance in Phase 1; the moment Watchtower
 * runs more than one instance, swap this for Upstash Redis (`@upstash/ratelimit`)
 * behind the same `checkRateLimit()` signature — no call site changes needed.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Periodically forget old buckets so this Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.windowStart > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Auth-route rate limit presets, tuned to block brute force without locking out real users. */
export const RATE_LIMITS = {
  login: { limit: 8, windowMs: 5 * 60 * 1000 },
  register: { limit: 5, windowMs: 15 * 60 * 1000 },
  forgotPassword: { limit: 4, windowMs: 15 * 60 * 1000 },
  resetPassword: { limit: 8, windowMs: 15 * 60 * 1000 },
  // Generous — a real app under load can legitimately burst-report the
  // same error many times; this exists to stop abuse of a public
  // unauthenticated endpoint, not to throttle normal error reporting.
  errorIngest: { limit: 120, windowMs: 60 * 1000 },
} as const;
