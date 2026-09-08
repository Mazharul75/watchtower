import { z } from "zod";

/**
 * Every real provider's raw output is parsed against this before the
 * pipeline trusts a single field of it — a model that returns malformed
 * JSON, a confidence outside [0,1], or a missing field fails validation and
 * the investigation abstains rather than propagating garbage.
 */
export const llmHypothesisSchema = z.object({
  hypothesis: z.string().nullable(),
  proposedFix: z.string().nullable(),
  citedNodeIds: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type RawLLMHypothesis = z.infer<typeof llmHypothesisSchema>;

/** Tolerates a model wrapping its JSON in prose or a markdown code fence. */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
