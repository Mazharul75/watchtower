import "server-only";
import type { LLMProvider } from "./types";
import { NoneProvider } from "./none-provider";
import { OllamaProvider } from "./ollama-provider";
import { AnthropicProvider } from "./anthropic-provider";

export * from "./types";

/**
 * Selected via LLM_PROVIDER — defaults to "none" (honest abstention, zero
 * setup) rather than silently trying Ollama and failing, so a fresh
 * deployment's behavior is obvious rather than surprising.
 */
export function getLLMProvider(): LLMProvider {
  switch (process.env.LLM_PROVIDER) {
    case "ollama":
      return new OllamaProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      return new NoneProvider();
  }
}
