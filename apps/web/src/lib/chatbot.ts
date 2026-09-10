import "server-only";
import { prisma } from "@/lib/prisma";
import { bm25Rank, vectorRank, reciprocalRankFusion } from "@/lib/retrieval";

// A cosine similarity below this is noise, not a real semantic match —
// with the deterministic feature-hashed embedder (see ADR-003), unrelated
// short texts still land in the 0.0-0.1 range purely from token-bucket
// collisions, not genuine overlap.
const VECTOR_RELEVANCE_THRESHOLD = 0.15;

// retrieval.ts's bm25Rank has no stopword filtering, which is fine at
// GitHub-graph scale (dozens+ of issues/PRs give BM25's idf math room to
// tell "refunds" apart from "of"). A chatbot's knowledge base commonly
// starts at ONE document, though, and BM25 is mathematically degenerate
// there: with N=1, every query that shares even a single token with that
// document scores identically regardless of which token — so an
// unrelated question sharing only "of" or "your" with the document
// would otherwise be treated as just as relevant as one sharing "refunds".
// Stripping stopwords from the QUESTION before ranking closes that hole
// without touching the shared, already-tested retrieval.ts.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "it", "its", "at", "on", "in", "of", "to", "for", "with", "as", "by", "be",
  "are", "was", "were", "been", "has", "have", "had", "do", "does", "did", "but", "or", "not", "so",
  "if", "than", "then", "what", "which", "who", "whom", "your", "you", "i", "we", "they", "he", "she",
  "my", "our", "their", "his", "her", "from", "about", "into", "up", "out", "over", "under", "again",
  "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most",
  "other", "some", "such", "no", "nor", "only", "own", "same", "too", "very", "can", "will", "just",
  "should", "now", "this", "that", "these", "those", "and", "me", "us",
]);

function stripStopwords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .join(" ");
}

const TOP_K = 4;

export interface ChatDocumentLike {
  id: string;
  title: string;
  content: string;
  embedding: number[];
}

export interface ChatAnswer {
  answer: string;
  citedDocumentIds: string[];
}

/**
 * Pure selection step — which documents (if any) are relevant enough to
 * ground an answer in. Kept separate from the DB/network calls below so
 * it's unit-testable without mocking Prisma or fetch, same split as
 * lib/investigation-logic.ts.
 *
 * Deliberately does NOT gate on the fused (Reciprocal Rank Fusion) score
 * the way retrieval.ts's hybridRank() alone would suggest — RRF scores
 * are rank-based, not relevance-based, so with a small candidate set the
 * single worst-ranked document still gets a positive score purely for
 * existing. The actual "is this relevant at all" check has to happen on
 * the RAW bm25/cosine scores first; RRF fusion only decides ORDERING
 * among documents that already passed that gate.
 */
export function selectContext(question: string, documents: ChatDocumentLike[], topK = TOP_K): ChatDocumentLike[] {
  if (documents.length === 0) return [];

  const query = stripStopwords(question);
  if (!query) return []; // the question was entirely stopwords — nothing meaningful to match on

  const asRetrievable = documents.map((d) => ({ id: d.id, text: `${d.title}\n${d.content}`, embedding: d.embedding }));
  const bm25 = bm25Rank(query, asRetrievable);
  const vector = vectorRank(query, asRetrievable);

  const bm25ById = new Map(bm25.map((r) => [r.id, r.score]));
  const vectorById = new Map(vector.map((r) => [r.id, r.score]));

  const relevantIds = new Set(
    documents
      .filter((d) => (bm25ById.get(d.id) ?? 0) > 0 || (vectorById.get(d.id) ?? 0) >= VECTOR_RELEVANCE_THRESHOLD)
      .map((d) => d.id),
  );
  if (relevantIds.size === 0) return [];

  const fused = reciprocalRankFusion([
    bm25.filter((r) => relevantIds.has(r.id)),
    vector.filter((r) => relevantIds.has(r.id)),
  ]);

  const byId = new Map(documents.map((d) => [d.id, d]));
  return fused
    .slice(0, topK)
    .map((r) => byId.get(r.id))
    .filter((d): d is ChatDocumentLike => Boolean(d));
}

export function buildPrompt(question: string, context: ChatDocumentLike[]): string {
  const contextText = context.map((c, i) => `[${i + 1}] ${c.title}\n${c.content}`).join("\n\n");
  return `You are a support assistant answering questions about a specific product or company. Use ONLY the context below — if it doesn't contain the answer, say plainly that you don't know rather than guessing or inventing information.

Context:
${contextText}

Question: ${question}

Answer concisely, in plain text, no markdown.`;
}

/**
 * The orchestration step (DB reads/writes, the Groq HTTP call) — analogous
 * to lib/investigation.ts's investigateNode(), not unit-tested directly
 * for the same reason: it's a thin sequence of real I/O calls, each of
 * which (hybridRank, the Groq fetch pattern) is already independently
 * tested. Every path here writes a ChatMessage row and returns an honest
 * answer — including "I don't know" and "no AI provider configured" —
 * never a fabricated one.
 */
export async function answerQuestion(chatbotId: string, question: string): Promise<ChatAnswer> {
  const documents = await prisma.chatDocument.findMany({ where: { chatbotId } });
  const context = selectContext(question, documents);

  if (context.length === 0) {
    const answer =
      documents.length === 0
        ? "This chatbot doesn't have any knowledge documents yet, so I can't answer questions."
        : "I don't have information about that in my knowledge base.";
    await prisma.chatMessage.create({ data: { chatbotId, question, answer, citedDocumentIds: [] } });
    return { answer, citedDocumentIds: [] };
  }

  const citedDocumentIds = context.map((c) => c.id);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const answer = `I found relevant information but no AI provider is configured to compose an answer yet. Relevant topics: ${context.map((c) => c.title).join(", ")}.`;
    await prisma.chatMessage.create({ data: { chatbotId, question, answer, citedDocumentIds } });
    return { answer, citedDocumentIds };
  }

  let answer: string;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        // See the matching comment in lib/llm/groq-provider.ts — this model
        // ID must be kept in sync with that one.
        model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
        messages: [{ role: "user", content: buildPrompt(question, context) }],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Groq returned HTTP ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    answer = data.choices[0]?.message.content?.trim() || "I couldn't generate an answer just now — please try again.";
  } catch {
    answer = "Something went wrong generating an answer. Please try again in a moment.";
  }

  await prisma.chatMessage.create({ data: { chatbotId, question, answer, citedDocumentIds } });
  return { answer, citedDocumentIds };
}
