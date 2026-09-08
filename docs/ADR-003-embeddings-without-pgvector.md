# ADR-003: Embeddings stored as `Float[]`, not a pgvector column, in Phase 2

## Status
Accepted — Phase 2.

## Context
The roadmap's Phase 2 spec calls for an embedding pipeline and hybrid
(BM25 + dense vector) retrieval, with the vector column explicitly modeled
on pgvector. Supabase (the documented production target) has pgvector
available as an enablable extension. The **local** development database
used to build and test this phase — a plain `embedded-postgres` binary, the
same zero-Docker setup Phase 1 used — does **not** ship the pgvector
extension, and Prisma's own pgvector support requires a preview feature
(`postgresqlExtensions`) plus the extension actually being installed in
whatever database Prisma migrates against.

## Decision
`Embedding.vector` is a native Postgres `Float[]` (a real, first-class
Postgres array type — not a workaround type, not JSON). Retrieval computes
cosine similarity in application code (`lib/retrieval.ts`) rather than via
a pgvector ANN index.

Embeddings themselves are produced by a **local, deterministic feature-hashing
function** (`lib/embeddings.ts`) — tokenize, hash each token into one of N
buckets, count — not a transformer model. This mirrors the "demo mode with
deterministic local embeddings, no paid API calls required" pattern the
original repo analysis found in IncidentLens and ScopeForce, and keeps
Phase 2 genuinely free and dependency-light: no ML runtime, no model
download, no API key.

## Consequences
- **Retrieval quality is honestly limited.** Feature-hashed bag-of-words
  vectors capture lexical overlap, not semantic meaning — two issues about
  "the login button is broken" and "auth CTA doesn't respond" would score
  low on the vector side (BM25 keyword scoring, computed independently,
  covers exact-term matches well; the two combined via reciprocal rank
  fusion is still meaningfully better than either alone, which is why both
  are implemented rather than only one).
- **Documented upgrade path, not a dead end:** swapping in real embeddings
  (fastembed locally, or an API-based embedding model) only requires
  changing `lib/embeddings.ts`'s implementation and bumping `Embedding.model`
  — every downstream consumer (retrieval, storage, the graph) is unaffected
  because they only ever see a `number[]` of a known dimension.
- **Moving to pgvector later is a schema migration, not a redesign:** add
  the extension in Supabase, add a pgvector column via a raw-SQL Prisma
  migration, backfill from the existing `Float[]` data, switch
  `lib/retrieval.ts`'s similarity computation to an SQL `ORDER BY embedding
  <=> $1` query. Nothing about the ingestion pipeline or the graph model
  changes.
- At Phase 2's scale (one repo's issue/PR history, not a search-engine-sized
  corpus), computing cosine similarity in application code over every node
  is fast enough that an ANN index isn't yet solving a real performance
  problem — it would be solving a problem Phase 2 doesn't have yet.
