import { createHash } from "node:crypto";

/**
 * Pure logic for the error-ingest pipeline, kept dependency-free (no
 * Prisma, no Next.js Request/Response) so it's unit-testable without
 * mocking the database — same separation as lib/investigation-logic.ts.
 */

export const VALID_ERROR_LEVELS = ["ERROR", "WARNING", "INFO"] as const;
export type ErrorLevel = (typeof VALID_ERROR_LEVELS)[number];

export function normalizeLevel(input: unknown): ErrorLevel {
  const upper = typeof input === "string" ? input.toUpperCase() : "";
  return (VALID_ERROR_LEVELS as readonly string[]).includes(upper) ? (upper as ErrorLevel) : "ERROR";
}

/**
 * Deterministic grouping signature — two events with the same level and
 * the same (normalized, truncated) message are treated as "the same
 * error", the way real error trackers dedupe repeat occurrences into one
 * issue with a count instead of one row per event.
 */
export function fingerprintFor(level: string, message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ").slice(0, 500);
  return createHash("sha256").update(`${level}|${normalized}`).digest("hex").slice(0, 32);
}

export function titleFor(message: string): string {
  return message.split("\n")[0]!.slice(0, 200);
}
