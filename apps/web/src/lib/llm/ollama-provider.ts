import type { LLMProvider, HypothesisRequest, HypothesisResponse } from "./types";
import { buildHypothesisPrompt } from "./prompt";
import { llmHypothesisSchema, extractJsonObject } from "./schema";

/**
 * Self-hosted, free-forever option — calls a local Ollama server's HTTP
 * API (https://github.com/ollama/ollama/blob/main/docs/api.md). No API key,
 * no per-token cost, no account. Requires the user to have Ollama installed
 * and a model pulled (e.g. `ollama pull llama3.1`); this provider's code is
 * correct against Ollama's documented API but was verified in the sandbox
 * this was built in only via a mock provider standing in for a live model
 * — see docs/ADR-004.
 */
export class OllamaProvider implements LLMProvider {
  readonly id = "ollama";

  constructor(
    private readonly baseUrl: string = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    private readonly model: string = process.env.OLLAMA_MODEL ?? "llama3.1",
  ) {}

  async generateHypothesis(request: HypothesisRequest): Promise<HypothesisResponse> {
    const prompt = buildHypothesisPrompt(request);

    let text: string;
    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, prompt, stream: false, format: "json" }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        return { ok: false, abstainReason: `Ollama returned HTTP ${res.status}. Is it running and is the model pulled?` };
      }
      const data = (await res.json()) as { response: string };
      text = data.response;
    } catch (err) {
      return {
        ok: false,
        abstainReason: `Could not reach Ollama at ${this.baseUrl}: ${err instanceof Error ? err.message : "unknown error"}.`,
      };
    }

    try {
      const parsed = llmHypothesisSchema.parse(extractJsonObject(text));
      if (!parsed.hypothesis) {
        return { ok: false, abstainReason: "The model itself reported insufficient evidence." };
      }
      return {
        ok: true,
        hypothesis: parsed.hypothesis,
        proposedFix: parsed.proposedFix ?? undefined,
        citedNodeIds: parsed.citedNodeIds,
        confidence: parsed.confidence,
      };
    } catch {
      return { ok: false, abstainReason: "The model's response did not match the required JSON shape." };
    }
  }
}
