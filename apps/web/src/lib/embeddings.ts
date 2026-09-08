/**
 * Deterministic, local, dependency-free "embedding" — a feature-hashed
 * bag-of-words vector. No model download, no API key, no network call.
 * See docs/ADR-003 for why this is the honest Phase 2 choice and what
 * upgrading to a real transformer model later would involve.
 */
export const EMBEDDING_MODEL_ID = "feature-hash-v1";
export const EMBEDDING_DIMENSIONS = 256;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

// A small, fast, non-cryptographic string hash (FNV-1a) — deterministic
// across runs and platforms, which is what matters here (cryptographic
// strength is irrelevant for bucket assignment).
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function embedText(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const bucket = fnv1a(token) % EMBEDDING_DIMENSIONS;
    vector[bucket] += 1;
  }

  // L2-normalize so cosine similarity is well-behaved regardless of document length.
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vectors must have the same dimensions");
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
  }
  // Vectors from embedText() are already L2-normalized, so the dot product
  // IS the cosine similarity — no need to divide by magnitudes again.
  return dot;
}
