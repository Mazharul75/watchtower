import { describe, it, expect } from "vitest";
import { embedText, cosineSimilarity, EMBEDDING_DIMENSIONS } from "./embeddings";

describe("embedText", () => {
  it("produces a vector of the fixed dimensionality", () => {
    expect(embedText("hello world")).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("is deterministic for the same input", () => {
    expect(embedText("the login button is broken")).toEqual(embedText("the login button is broken"));
  });

  it("is L2-normalized", () => {
    const vector = embedText("some reasonably long piece of text to embed");
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("returns a zero vector for empty text without throwing", () => {
    expect(embedText("")).toEqual(new Array(EMBEDDING_DIMENSIONS).fill(0));
  });
});

describe("cosineSimilarity", () => {
  it("is 1.0 for identical vectors", () => {
    const v = embedText("database connection timeout");
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("scores near-duplicate text higher than unrelated text", () => {
    const base = embedText("the database connection keeps timing out under load");
    const similar = embedText("database connections are timing out under heavy load");
    const unrelated = embedText("update the marketing homepage copy");

    expect(cosineSimilarity(base, similar)).toBeGreaterThan(cosineSimilarity(base, unrelated));
  });

  it("throws on mismatched dimensions", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});
