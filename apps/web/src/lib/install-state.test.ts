import { describe, it, expect, vi } from "vitest";
import { signInstallState, verifyInstallState } from "./install-state";

describe("install state signing", () => {
  it("round-trips the organizationId through sign and verify", () => {
    const state = signInstallState("org_123");
    expect(verifyInstallState(state)).toEqual({ organizationId: "org_123" });
  });

  it("rejects a tampered state string", () => {
    const state = signInstallState("org_123");
    const tampered = state.slice(0, -2) + "xx";
    expect(verifyInstallState(tampered)).toBeNull();
  });

  it("rejects a state signed for a different organization by hand-editing the payload", () => {
    const state = signInstallState("org_123");
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [, timestamp, signature] = decoded.split(".");
    const forged = Buffer.from(`org_999.${timestamp}.${signature}`).toString("base64url");
    expect(verifyInstallState(forged)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(verifyInstallState("not-valid-base64url-state")).toBeNull();
    expect(verifyInstallState("")).toBeNull();
  });

  it("rejects an expired state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const state = signInstallState("org_123");

    vi.setSystemTime(new Date("2026-01-01T00:20:00Z")); // 20 minutes later, past the 15-minute TTL
    expect(verifyInstallState(state)).toBeNull();
    vi.useRealTimers();
  });
});
