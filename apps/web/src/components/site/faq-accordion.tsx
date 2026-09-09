"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Does Watchtower ever push code without my approval?",
    a: "No. A fix proposal always opens as a draft pull request containing the incident report — never a direct commit or merge — and only after a human clicks Approve. There's no code path that reaches GitHub without that row transitioning to APPROVED by a real account first.",
  },
  {
    q: "What happens when it isn't confident in a cause?",
    a: "It abstains, explicitly and visibly, with a stated reason — instead of guessing. A hypothesis is only shown when the evidence clears a real confidence threshold; anything short of that becomes an honest \"not enough to go on,\" not a plausible-sounding fabrication.",
  },
  {
    q: "Where does the retrieval / evidence come from?",
    a: "A hybrid of real BM25 keyword search and cosine similarity over your repo's own issues, PRs, commits, and check runs — combined with Reciprocal Rank Fusion. Every citation in a hypothesis is checked against what the model was actually shown before it's trusted.",
  },
  {
    q: "Do I need to pay for an LLM to use this?",
    a: "No. Watchtower runs with a self-hosted Ollama model by default, or with no LLM provider configured at all (in which case it always abstains rather than silently doing nothing) — an API key for a hosted provider is optional, never required.",
  },
  {
    q: "What actually enforces who can see and do what?",
    a: "Server-side role checks on every request — organization owner/admin/member/viewer — re-verified in the route handler itself, not just hidden in the UI. A second backend service (FastAPI) independently proves the same boundary by reading the same session.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} className="glass-card overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[var(--color-foreground)]"
            >
              {item.q}
              <span
                className="shrink-0 text-[var(--color-foreground-subtle)] transition-transform duration-200"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-200 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--color-foreground-muted)]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
