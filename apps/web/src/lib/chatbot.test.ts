import { describe, it, expect } from "vitest";
import { embedText } from "@/lib/embeddings";
import { selectContext, buildPrompt, type ChatDocumentLike } from "./chatbot";

function doc(id: string, title: string, content: string): ChatDocumentLike {
  return { id, title, content, embedding: embedText(`${title}\n${content}`) };
}

describe("selectContext", () => {
  it("returns nothing when there are no documents at all", () => {
    expect(selectContext("How do refunds work?", [])).toEqual([]);
  });

  it("returns nothing when no document is relevant to the question", () => {
    const documents = [doc("d1", "Shipping policy", "We ship within two business days via courier.")];
    const result = selectContext("What programming language is this written in", documents);
    expect(result).toEqual([]);
  });

  it("returns the relevant document for a matching question", () => {
    const documents = [
      doc("d1", "Refund policy", "Refunds are issued within 14 days of purchase, no questions asked."),
      doc("d2", "Shipping policy", "We ship within two business days via courier."),
    ];
    const result = selectContext("How do refunds work?", documents);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.id).toBe("d1");
  });

  it("does not treat a shared stopword as relevance in a single-document knowledge base — regression for a real bug found via live smoke test", () => {
    // BM25 is mathematically degenerate with a 1-document corpus: any
    // shared token (however meaningless) scores identically to any other.
    // "What is the capital of France?" shares only "of" with this refund
    // doc's content ("...within 14 days OF purchase...") — that must NOT
    // be enough to call the two related.
    const documents = [
      doc("d1", "Refund policy", "Refunds are issued within 14 days of purchase, no questions asked, straight back to your original payment method."),
    ];
    expect(selectContext("What is the capital of France?", documents)).toEqual([]);
    expect(selectContext("Tell me about your favorite pizza toppings", documents)).toEqual([]);
    // The genuinely relevant question must still match.
    expect(selectContext("How do refunds work?", documents)).toHaveLength(1);
  });

  it("caps results at topK", () => {
    const documents = Array.from({ length: 10 }, (_, i) => doc(`d${i}`, "Refund policy details", `Refunds refunds refunds section ${i}.`));
    const result = selectContext("refunds", documents, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("buildPrompt", () => {
  it("includes the question and every context document's title and content", () => {
    const context = [doc("d1", "Refund policy", "Refunds within 14 days.")];
    const prompt = buildPrompt("How do refunds work?", context);
    expect(prompt).toContain("How do refunds work?");
    expect(prompt).toContain("Refund policy");
    expect(prompt).toContain("Refunds within 14 days.");
  });

  it("instructs the model to say it doesn't know rather than invent an answer", () => {
    const prompt = buildPrompt("anything", [doc("d1", "t", "c")]);
    expect(prompt.toLowerCase()).toContain("don't know");
  });
});
