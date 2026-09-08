import { describe, it, expect } from "vitest";
import { generateRawToken, hashToken, expiryFromNow, isExpired } from "./tokens";

describe("tokens", () => {
  it("generates unique high-entropy tokens", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThan(30);
  });

  it("hashes deterministically so a stored hash can be matched against a fresh hash of the same raw token", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toEqual(hashToken(raw));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateRawToken())).not.toEqual(hashToken(generateRawToken()));
  });

  it("computes expiry correctly and flags expired timestamps", () => {
    const future = expiryFromNow(1000 * 60);
    expect(isExpired(future)).toBe(false);

    const past = new Date(Date.now() - 1000);
    expect(isExpired(past)).toBe(true);
  });
});
