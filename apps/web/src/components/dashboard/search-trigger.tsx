"use client";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wt:open-search"))}
      className="flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm text-[var(--color-foreground-subtle)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Search…</span>
      <kbd className="hidden rounded border border-[var(--color-border-strong)] px-1 text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}
