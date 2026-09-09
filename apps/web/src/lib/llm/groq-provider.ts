import type { LLMProvider, HypothesisRequest, HypothesisResponse } from "./types";
import { buildHypothesisPrompt } from "./prompt";
import { llmHypothesisSchema, extractJsonObject } from "./schema";

/**
 * The practical zero-cost option for a REAL deployed instance (unlike
 * Ollama, which needs a server you keep running yourself — impossible on
 * Vercel's serverless runtime, since there's nothing to reach at
 * localhost:11434 in production). Groq's API is free with no card, no
 * self-hosting, and an OpenAI-compatible Chat Completions endpoint, so
 * this provider is a thin fetch call just like AnthropicProvider — same
 * shape, same schema validation, same honest-abstention-on-failure
 * behavior, just a different HTTP endpoint and free by default instead of
 * requiring a paid key.
 */
export class GroqProvider implements LLMProvider {
  readonly id = "groq";

  constructor(
    private readonly apiKey: string | undefined = process.env.GROQ_API_KEY,
    private readonly model: string = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  ) {}

  async generateHypothesis(request: HypothesisRequest): Promise<HypothesisResponse> {
    if (!this.apiKey) {
      return { ok: false, abstainReason: "GROQ_API_KEY is not set." };
    }

    const prompt = buildHypothesisPrompt(request);

    let text: string;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        return { ok: false, abstainReason: `Groq API returned HTTP ${res.status}. Check GROQ_API_KEY and GROQ_MODEL.` };
      }
      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      text = data.choices[0]?.message.content ?? "";
    } catch (err) {
      return { ok: false, abstainReason: `Could not reach the Groq API: ${err instanceof Error ? err.message : "unknown error"}.` };
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
