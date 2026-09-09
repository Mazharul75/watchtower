import { describe, it, expect } from "vitest";
import { normalizeLevel, fingerprintFor, titleFor } from "./error-tracking";

describe("normalizeLevel", () => {
  it("accepts the three valid levels, case-insensitively", () => {
    expect(normalizeLevel("error")).toBe("ERROR");
    expect(normalizeLevel("Warning")).toBe("WARNING");
    expect(normalizeLevel("INFO")).toBe("INFO");
  });

  it("defaults to ERROR for anything invalid or missing", () => {
    expect(normalizeLevel("critical")).toBe("ERROR");
    expect(normalizeLevel(undefined)).toBe("ERROR");
    expect(normalizeLevel(42)).toBe("ERROR");
  });
});

describe("fingerprintFor", () => {
  it("produces the same fingerprint for the same level+message", () => {
    const a = fingerprintFor("ERROR", "Cannot read property 'x' of undefined");
    const b = fingerprintFor("ERROR", "Cannot read property 'x' of undefined");
    expect(a).toBe(b);
  });

  it("produces a different fingerprint for a different level", () => {
    const a = fingerprintFor("ERROR", "Same message");
    const b = fingerprintFor("WARNING", "Same message");
    expect(a).not.toBe(b);
  });

  it("produces a different fingerprint for a different message", () => {
    const a = fingerprintFor("ERROR", "Message one");
    const b = fingerprintFor("ERROR", "Message two");
    expect(a).not.toBe(b);
  });

  it("normalizes whitespace so trivially reformatted messages still group together", () => {
    const a = fingerprintFor("ERROR", "Something   broke\n\nhere");
    const b = fingerprintFor("ERROR", "Something broke here");
    expect(a).toBe(b);
  });

  it("is stable in length regardless of message length", () => {
    const short = fingerprintFor("ERROR", "x");
    const long = fingerprintFor("ERROR", "x".repeat(5000));
    expect(short).toHaveLength(32);
    expect(long).toHaveLength(32);
  });
});

describe("titleFor", () => {
  it("takes only the first line of a multi-line message", () => {
    expect(titleFor("First line\nSecond line\nThird line")).toBe("First line");
  });

  it("truncates a very long single-line message", () => {
    const result = titleFor("x".repeat(500));
    expect(result.length).toBe(200);
  });
});
