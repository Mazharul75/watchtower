import "server-only";
import type { LLMProvider } from "./types";
import { NoneProvider } from "./none-provider";
import { OllamaProvider } from "./ollama-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GroqProvider } from "./groq-provider";

export * from "./types";

/**
 * Selected via LLM_PROVIDER — defaults to "none" (honest abstention, zero
 * setup) rather than silently trying a provider and failing, so a fresh
 * deployment's behavior is obvious rather than surprising.
 *
 *  - "groq": free, no self-hosting — the practical default for a real
 *    deployed instance. See docs/SETUP_FROM_SCRATCH.md.
 *  - "ollama": free but requires a server YOU keep running and reachable
 *    at OLLAMA_BASE_URL — works for local dev, not for Vercel's serverless
 *    runtime (there's nothing listening at localhost:11434 in production).
 *  - "anthropic": the only provider with a real per-token cost; opt-in only.
 */
export function getLLMProvider(): LLMProvider {
  switch (process.env.LLM_PROVIDER) {
    case "groq":
      return new GroqProvider();
    case "ollama":
      return new OllamaProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      return new NoneProvider();
  }
}
