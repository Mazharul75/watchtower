import { describe, it, expect, vi, afterEach } from "vitest";
import { postToSlack } from "./slack";

describe("postToSlack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok:true on a successful post", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const result = await postToSlack("https://hooks.slack.com/services/x", "hello");
    expect(result.ok).toBe(true);
  });

  it("returns ok:false with the status when Slack rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await postToSlack("https://hooks.slack.com/services/x", "hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("404");
  });

  it("returns ok:false instead of throwing when the request fails outright", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await postToSlack("https://hooks.slack.com/services/x", "hello");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("network down");
  });
});
