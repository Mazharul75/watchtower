import { describe, it, expect, vi, afterEach } from "vitest";
import { OllamaProvider } from "./ollama-provider";

const REQUEST: Parameters<OllamaProvider["generateHypothesis"]>[0] = {
  incidentSummary: "CI failure",
  evidence: [{ nodeId: "n1", type: "ISSUE", externalId: "1", title: "Login broken", body: "details", score: 1 }],
};

describe("OllamaProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a valid hypothesis when Ollama responds with well-formed JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({ hypothesis: "Pool exhaustion", proposedFix: "Increase pool size", citedNodeIds: ["n1"], confidence: 0.8 }),
        }),
      }),
    );

    const provider = new OllamaProvider("http://localhost:11434", "llama3.1");
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
        json: async () => ({ response: JSON.stringify({ hypothesis: null, proposedFix: null, citedNodeIds: [], confidence: 0 }) }),
      }),
    );
    const result = await new OllamaProvider().generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
  });

  it("abstains gracefully when Ollama returns malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ response: "not json at all" }) }));
    const result = await new OllamaProvider().generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("JSON shape");
  });

  it("abstains gracefully on a non-2xx response instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const result = await new OllamaProvider().generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("500");
  });

  it("abstains gracefully when the server is unreachable instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await new OllamaProvider().generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
    expect(result.abstainReason).toContain("Could not reach Ollama");
  });

  it("never lets an adversarial confidence=1 claim bypass validation if the JSON shape is otherwise invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: JSON.stringify({ hypothesis: "x", confidence: 1.0 /* missing citedNodeIds and proposedFix */ }) }),
      }),
    );
    const result = await new OllamaProvider().generateHypothesis(REQUEST);
    expect(result.ok).toBe(false);
  });
});
