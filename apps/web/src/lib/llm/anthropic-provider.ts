import type { LLMProvider, HypothesisRequest, HypothesisResponse } from "./types";
import { buildHypothesisPrompt } from "./prompt";
import { llmHypothesisSchema, extractJsonObject } from "./schema";

/**
 * Optional, bring-your-own-key path — calls the Anthropic Messages API
 * directly over fetch (no SDK dependency for one endpoint). This is the
 * one component in Watchtower with a real per-token cost; it is never
 * selected unless ANTHROPIC_API_KEY is set and LLM_PROVIDER=anthropic —
 * Ollama remains the zero-cost default.
 */
export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic";

  constructor(
    private readonly apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
    private readonly model: string = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  ) {}

  async generateHypothesis(request: HypothesisRequest): Promise<HypothesisResponse> {
    if (!this.apiKey) {
      return { ok: false, abstainReason: "ANTHROPIC_API_KEY is not set." };
    }

    const prompt = buildHypothesisPrompt(request);

    let text: string;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        return { ok: false, abstainReason: `Anthropic API returned HTTP ${res.status}.` };
      }
      const data = (await res.json()) as { content: { type: string; text?: string }[] };
      text = data.content.find((block) => block.type === "text")?.text ?? "";
    } catch (err) {
      return { ok: false, abstainReason: `Could not reach the Anthropic API: ${err instanceof Error ? err.message : "unknown error"}.` };
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
