type Tone = "danger" | "success" | "info" | "warning";

const toneStyles: Record<Tone, string> = {
  danger: "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[#FCA5B1]",
  success: "bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[#6EE7B7]",
  info: "bg-[var(--color-info)]/10 border-[var(--color-info)]/30 text-[#7DD3FC]",
  warning: "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[#FCD34D]",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return <div className={`rounded-xl border px-4 py-3 text-sm ${toneStyles[tone]}`}>{children}</div>;
}

export function Badge({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
