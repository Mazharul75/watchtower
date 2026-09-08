/**
 * Provider-agnostic LLM interface — see docs/ADR-004. Every provider
 * (including "none") implements exactly this shape, so the investigation
 * pipeline never branches on which one is configured.
 */

export interface EvidenceItem {
  nodeId: string;
  type: string;
  externalId: string;
  title: string | null;
  body: string | null;
  score: number;
}

export interface HypothesisRequest {
  incidentSummary: string;
  evidence: EvidenceItem[];
}

export interface HypothesisResponse {
  /** True only when the provider produced a usable, cited hypothesis. */
  ok: boolean;
  hypothesis?: string;
  proposedFix?: string;
  /** Node ids from the SAME evidence list the request was built from — never trusted until verified against it. */
  citedNodeIds?: string[];
  confidence?: number;
  /** Present when ok is false — why no hypothesis is being offered. */
  abstainReason?: string;
}

export interface LLMProvider {
  readonly id: string;
  generateHypothesis(request: HypothesisRequest): Promise<HypothesisResponse>;
}
