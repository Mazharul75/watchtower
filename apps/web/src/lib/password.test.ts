import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("a-very-secure-password-123");
    expect(hash).not.toEqual("a-very-secure-password-123");
    expect(await verifyPassword(hash, "a-very-secure-password-123")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-password-1");
    expect(await verifyPassword(hash, "wrong-password-1")).toBe(false);
  });

  it("returns false instead of throwing for a malformed hash", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(validatePasswordStrength("short1").ok).toBe(false);
  });

  it("rejects passwords longer than 128 characters", () => {
    expect(validatePasswordStrength("a".repeat(129)).ok).toBe(false);
  });

  it("rejects known common passwords", () => {
    expect(validatePasswordStrength("password123").ok).toBe(false);
  });

  it("accepts a reasonable password", () => {
    expect(validatePasswordStrength("correct-horse-battery-staple").ok).toBe(true);
  });
});
