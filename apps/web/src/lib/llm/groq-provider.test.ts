import { describe, it, expect, vi, afterEach } from "vitest";
import { GroqProvider } from "./groq-provider";

const REQUEST: Parameters<GroqProvider["generateHypothesis"]>[0] = {
  incidentSummary: "CI failure",
  evidence: [{ nodeId: "n1", type: "ISSUE", externalId: "1", title: "Login broken", body: "details", score: 1 }],
};

describe("GroqProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("abstains immediately when no API key is configured, without making a request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await new GroqProvider(undefined).generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("GROQ_API_KEY");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a valid hypothesis when Groq responds with well-formed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ hypothesis: "Pool exhaustion", proposedFix: "Increase pool size", citedNodeIds: ["n1"], confidence: 0.8 }) } }],
        }),
      }),
    );

    const provider = new GroqProvider("test-key", "llama-3.3-70b-versatile");
    const result = await provider.generateHypothesis(REQUEST);

    expect(result.ok).toBe(true);
    expect(result.hypothesis).toBe("Pool exhaustion");
    expect(result.citedNodeIds).toEqual(["n1"]);
  });

  it("abstains when the model itself reports a null hypothesis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ hypothesis: null, proposedFix: null, citedNodeIds: [], confidence: 0 }) } }] }),
      }),
    );
    const result = await new GroqProvider("test-key").generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
  });

  it("abstains gracefully when Groq returns malformed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "not json at all" } }] }) }),
    );
    const result = await new GroqProvider("test-key").generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("JSON shape");
  });

  it("abstains gracefully on a non-2xx response instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const result = await new GroqProvider("bad-key").generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("401");
  });

  it("abstains gracefully when the API is unreachable instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await new GroqProvider("test-key").generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("Could not reach the Groq API");
  });
});
