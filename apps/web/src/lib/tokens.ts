import { randomBytes, createHash } from "node:crypto";

/**
 * Shared pattern for both email-verification and password-reset links:
 * generate a high-entropy random token, email the RAW token to the user,
 * but persist only its SHA-256 hash in the database. This means a leaked
 * database dump never yields usable tokens (same principle as password
 * hashing, applied to one-time links).
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24h
export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 15; // 15 minutes

export function expiryFromNow(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}

export function isExpired(expires: Date): boolean {
  return expires.getTime() < Date.now();
}
