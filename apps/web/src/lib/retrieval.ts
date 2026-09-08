import { embedText, cosineSimilarity } from "./embeddings";

/**
 * Hybrid retrieval: BM25 keyword scoring + dense-vector cosine similarity,
 * combined via Reciprocal Rank Fusion (RRF) — the same three-part pattern
 * described in the roadmap ("BM25 + dense embeddings with reciprocal rank
 * fusion"), built here in Phase 2 so Phase 3's root-cause analysis has a
 * real retrieval step to call rather than starting from nothing.
 *
 * Scale note: this computes scores over the candidate array in memory
 * (fine for one repo's node count — see docs/ADR-003) rather than an
 * indexed search engine or a pgvector ANN query.
 */

export interface RetrievableDocument {
  id: string;
  text: string;
  embedding?: number[] | null;
}

export interface ScoredDocument {
  id: string;
  score: number;
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Standard Okapi BM25 over the given corpus for a single query. */
export function bm25Rank(query: string, documents: RetrievableDocument[]): ScoredDocument[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || documents.length === 0) return [];

  const docTokens = documents.map((doc) => tokenize(doc.text));
  const docLengths = docTokens.map((tokens) => tokens.length);
  const avgDocLength = docLengths.reduce((sum, len) => sum + len, 0) / documents.length || 1;

  const documentFrequency = new Map<string, number>();
  for (const tokens of docTokens) {
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const N = documents.length;
  const idf = new Map<string, number>();
  for (const term of new Set(queryTerms)) {
    const df = documentFrequency.get(term) ?? 0;
    // +1 smoothing keeps idf finite (and non-negative) even for terms that
    // appear in every document or don't appear in the corpus at all.
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  return documents.map((doc, i) => {
    const tokens = docTokens[i]!;
    const termCounts = new Map<string, number>();
    for (const token of tokens) termCounts.set(token, (termCounts.get(token) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const tf = termCounts.get(term) ?? 0;
      if (tf === 0) continue;
      const numerator = tf * (BM25_K1 + 1);
      const denominator = tf + BM25_K1 * (1 - BM25_B + (BM25_B * docLengths[i]!) / avgDocLength);
      score += (idf.get(term) ?? 0) * (numerator / denominator);
    }

    return { id: doc.id, score };
  });
}

export function vectorRank(query: string, documents: RetrievableDocument[]): ScoredDocument[] {
  const queryVector = embedText(query);
  return documents
    .filter((doc) => doc.embedding && doc.embedding.length > 0)
    .map((doc) => ({ id: doc.id, score: cosineSimilarity(queryVector, doc.embedding!) }));
}

/**
 * Reciprocal Rank Fusion: combine two ranked lists by rank position, not
 * raw score — this is what makes it meaningful to fuse BM25 (unbounded,
 * corpus-dependent scores) with cosine similarity (bounded [-1, 1])
 * without one dominating just because its numbers happen to be bigger.
 */
export function reciprocalRankFusion(rankings: ScoredDocument[][], k = 60): ScoredDocument[] {
  const fusedScores = new Map<string, number>();

  for (const ranking of rankings) {
    const sorted = [...ranking].sort((a, b) => b.score - a.score);
    sorted.forEach((doc, rank) => {
      const contribution = 1 / (k + rank + 1);
      fusedScores.set(doc.id, (fusedScores.get(doc.id) ?? 0) + contribution);
    });
  }

  return [...fusedScores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

export function hybridRank(query: string, documents: RetrievableDocument[]): ScoredDocument[] {
  const bm25 = bm25Rank(query, documents);
  const vector = vectorRank(query, documents);
  return reciprocalRankFusion([bm25, vector]);
}
