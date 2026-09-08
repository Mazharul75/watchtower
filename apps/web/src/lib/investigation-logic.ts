/**
 * Pure decision logic pulled out of investigation.ts so it's testable
 * without a database — mirrors the graph-builder.ts / ingestion.ts split
 * from Phase 2.
 */

export const MIN_CONFIDENCE_FOR_APPROVAL = 0.4;

/**
 * Citation verification: a model can only be trusted to have cited
 * evidence it was actually shown. Anything else — a hallucinated node id,
 * a typo, a reference to something outside the retrieved set — is dropped
 * rather than trusted.
 */
export function verifyCitations(citedNodeIds: string[], retrievedNodeIds: string[]): string[] {
  const retrieved = new Set(retrievedNodeIds);
  return citedNodeIds.filter((id) => retrieved.has(id));
}

export type ConfidenceDecision = "AWAITING_APPROVAL" | "ABSTAINED";

export function decideOutcome(confidence: number, validCitationCount: number): ConfidenceDecision {
  if (validCitationCount === 0) return "ABSTAINED";
  return confidence >= MIN_CONFIDENCE_FOR_APPROVAL ? "AWAITING_APPROVAL" : "ABSTAINED";
}
