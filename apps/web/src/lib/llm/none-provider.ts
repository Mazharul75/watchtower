import type { LLMProvider, HypothesisRequest, HypothesisResponse } from "./types";

/**
 * The honest default: no LLM configured, so no hypothesis is fabricated.
 * Every investigation that reaches this provider lands in ABSTAINED —
 * exactly the roadmap's "abstention is a first-class state" requirement,
 * not an error condition.
 */
export class NoneProvider implements LLMProvider {
  readonly id = "none";

  async generateHypothesis(_request: HypothesisRequest): Promise<HypothesisResponse> {
    return { ok: false, abstainReason: "No LLM provider is configured (set LLM_PROVIDER to enable root-cause analysis)." };
  }
}
