import { describe, it, expect } from "vitest";
import { llmHypothesisSchema, extractJsonObject } from "./schema";

describe("extractJsonObject", () => {
  it("parses a plain JSON string", () => {
    expect(extractJsonObject('{"a": 1}')).toEqual({ a: 1 });
  });

  it("extracts JSON from a markdown code fence", () => {
    const text = 'Here is my answer:\n```json\n{"a": 1}\n```\nHope that helps!';
    expect(extractJsonObject(text)).toEqual({ a: 1 });
  });

  it("extracts JSON embedded in surrounding prose without a fence", () => {
    const text = 'Sure, here you go: {"a": 1} — let me know if you need more.';
    expect(extractJsonObject(text)).toEqual({ a: 1 });
  });

  it("throws when there is no JSON object at all", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });
});

describe("llmHypothesisSchema", () => {
  it("accepts a well-formed hypothesis", () => {
    const result = llmHypothesisSchema.safeParse({
      hypothesis: "The connection pool is exhausted under load.",
      proposedFix: "Increase the pool size.",
      citedNodeIds: ["n1", "n2"],
      confidence: 0.8,
    });
    expect(result.success).toBe(true);
  });

  it("accepts an abstention shape (null hypothesis)", () => {
    const result = llmHypothesisSchema.safeParse({
      hypothesis: null,
      proposedFix: null,
      citedNodeIds: [],
      confidence: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a confidence outside [0, 1]", () => {
    expect(llmHypothesisSchema.safeParse({ hypothesis: "x", proposedFix: null, citedNodeIds: [], confidence: 1.5 }).success).toBe(false);
    expect(llmHypothesisSchema.safeParse({ hypothesis: "x", proposedFix: null, citedNodeIds: [], confidence: -0.1 }).success).toBe(false);
  });

  it("rejects a response missing required fields", () => {
    expect(llmHypothesisSchema.safeParse({ hypothesis: "x" }).success).toBe(false);
  });
});
