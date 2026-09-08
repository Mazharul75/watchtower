"use client";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-raised)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-lg leading-none text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]"
        >
          ×
        </button>
        <h2 className="mb-4 pr-6 text-lg font-semibold text-[var(--color-foreground)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
