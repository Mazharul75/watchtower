import { describe, it, expect } from "vitest";
import { bm25Rank, vectorRank, reciprocalRankFusion, hybridRank, type RetrievableDocument } from "./retrieval";
import { embedText } from "./embeddings";

const DOCS: RetrievableDocument[] = [
  { id: "1", text: "Login button does not respond when clicked on mobile Safari" },
  { id: "2", text: "Database connection pool exhausted under high load" },
  { id: "3", text: "Add dark mode toggle to settings page" },
];

describe("bm25Rank", () => {
  it("ranks the document containing the query terms highest", () => {
    const ranked = bm25Rank("login button mobile", DOCS).sort((a, b) => b.score - a.score);
    expect(ranked[0]!.id).toBe("1");
  });

  it("gives every document a zero score for a query with no matching terms", () => {
    const ranked = bm25Rank("xyzzy nonexistent term", DOCS);
    expect(ranked.every((d) => d.score === 0)).toBe(true);
  });

  it("returns an empty array for an empty query or empty corpus", () => {
    expect(bm25Rank("", DOCS)).toEqual([]);
    expect(bm25Rank("login", [])).toEqual([]);
  });
});

describe("vectorRank", () => {
  it("ranks semantically closer documents higher using embeddings", () => {
    const withEmbeddings = DOCS.map((d) => ({ ...d, embedding: embedText(d.text) }));
    const ranked = vectorRank("database pool connections timing out", withEmbeddings).sort((a, b) => b.score - a.score);
    expect(ranked[0]!.id).toBe("2");
  });

  it("skips documents with no embedding", () => {
    const mixed = [DOCS[0]!, { ...DOCS[1]!, embedding: embedText(DOCS[1]!.text) }];
    const ranked = vectorRank("database", mixed);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.id).toBe("2");
  });
});

describe("reciprocalRankFusion", () => {
  it("boosts a document that ranks well in both input lists", () => {
    const rankingA = [
      { id: "a", score: 10 },
      { id: "b", score: 5 },
    ];
    const rankingB = [
      { id: "a", score: 0.9 },
      { id: "c", score: 0.1 },
    ];
    const fused = reciprocalRankFusion([rankingA, rankingB]);
    expect(fused[0]!.id).toBe("a");
  });

  it("still includes a document that only appears in one ranking", () => {
    const fused = reciprocalRankFusion([[{ id: "only-here", score: 1 }], []]);
    expect(fused.map((d) => d.id)).toContain("only-here");
  });
});

describe("hybridRank", () => {
  it("combines keyword and vector signals end to end", () => {
    const withEmbeddings = DOCS.map((d) => ({ ...d, embedding: embedText(d.text) }));
    const ranked = hybridRank("login button broken on mobile", withEmbeddings);
    expect(ranked[0]!.id).toBe("1");
  });
});
