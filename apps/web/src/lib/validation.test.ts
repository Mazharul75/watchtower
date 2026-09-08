import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, usernameSchema } from "./validation";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Ada Lovelace",
      username: "ada",
      email: "ADA@Example.com",
      password: "correct-horse-battery",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ada@example.com"); // lowercased
    }
  });

  it("rejects an invalid email", () => {
    expect(registerSchema.safeParse({ name: "A", username: "ada", email: "not-an-email", password: "correct-horse-battery" }).success).toBe(false);
  });

  it("rejects a password under 10 characters", () => {
    expect(registerSchema.safeParse({ name: "A", username: "ada", email: "a@b.com", password: "short" }).success).toBe(false);
  });
});

describe("usernameSchema", () => {
  it("rejects usernames with invalid characters", () => {
    expect(usernameSchema.safeParse("ada lovelace").success).toBe(false);
    expect(usernameSchema.safeParse("ada@lovelace").success).toBe(false);
  });

  it("accepts valid usernames", () => {
    expect(usernameSchema.safeParse("ada_lovelace-2").success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
