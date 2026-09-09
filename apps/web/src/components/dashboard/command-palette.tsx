"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ResultItem {
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

interface SearchResults {
  organizations: ResultItem[];
  repositories: ResultItem[];
  incidents: ResultItem[];
}

const EMPTY: SearchResults = { organizations: [], repositories: [], incidents: [] };

function flatten(results: SearchResults): ResultItem[] {
  return [...results.organizations, ...results.repositories, ...results.incidents];
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(EMPTY);
    setActiveIndex(0);
  }, []);

  // Global Cmd/Ctrl+K opens the palette from anywhere in the dashboard;
  // Escape closes it. The Topbar's visible search button opens it too, via
  // a custom event — simpler than lifting this component's state up
  // through the server-rendered layout just for one button to reach it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        close();
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("wt:open-search", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wt:open-search", onOpenEvent);
    };
  }, [close]);

  useEffect(() => {
    if (open) {
      // Wait a tick for the input to mount before focusing it.
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data);
          setActiveIndex(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  const flat = flatten(results);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[activeIndex]) {
      e.preventDefault();
      router.push(flat[activeIndex].href);
      close();
    }
  }

  if (!open) return null;

  const groups: { title: string; items: ResultItem[] }[] = [
    { title: "Organizations", items: results.organizations },
    { title: "Repositories", items: results.repositories },
    { title: "Incidents", items: results.incidents },
  ].filter((g) => g.items.length > 0);

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" onClick={close}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-raised)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--color-foreground-subtle)]">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search organizations, repositories, incidents…"
            className="w-full bg-transparent text-sm text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-foreground-subtle)]"
          />
          <kbd className="shrink-0 rounded border border-[var(--color-border-strong)] px-1.5 py-0.5 text-[10px] text-[var(--color-foreground-subtle)]">Esc</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-foreground-subtle)]">Type at least 2 characters to search.</p>
          ) : loading ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-foreground-subtle)]">Searching…</p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--color-foreground-subtle)]">No results for &ldquo;{query}&rdquo;.</p>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="mb-2 last:mb-0">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">{group.title}</p>
                {group.items.map((item) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  const idx = runningIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        router.push(item.href);
                        close();
                      }}
                      className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive ? "bg-[var(--color-brand-indigo)]/10" : "hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="truncate text-sm font-medium text-[var(--color-foreground)]">{item.label}</span>
                      <span className="truncate text-xs text-[var(--color-foreground-subtle)]">{item.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
