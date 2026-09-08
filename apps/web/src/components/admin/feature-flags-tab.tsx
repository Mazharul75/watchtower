"use client";

import { useEffect, useState } from "react";
import { Spinner, Alert } from "@/components/ui/alert";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
}

const SEEDED_FLAG_HELP: Record<string, string> = {
  "phase2.github_ingestion": "Enables GitHub App installation and repo ingestion once Phase 2 ships.",
  "phase3.ai_rca": "Enables AI-generated root-cause analysis once Phase 3 ships.",
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-brand-gradient" : "bg-[var(--color-border-strong)]"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setFlags(data.flags);
      });
  }, []);

  async function toggle(key: string, current: boolean) {
    setBusyKey(key);
    const res = await fetch("/api/admin/feature-flags", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled: !current }),
    });
    const data = await res.json();
    if (res.ok) {
      setFlags((prev) => {
        const others = (prev ?? []).filter((f) => f.key !== key);
        return [...others, data.flag].sort((a, b) => a.key.localeCompare(b.key));
      });
    }
    setBusyKey(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!flags) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading feature flags…
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {flags.map((f) => (
        <li key={f.key} className="flex items-center justify-between py-3">
          <div>
            <p className="font-mono text-sm text-[var(--color-foreground)]">{f.key}</p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">{f.description ?? SEEDED_FLAG_HELP[f.key] ?? ""}</p>
          </div>
          <Toggle checked={f.enabled} disabled={busyKey === f.key} onChange={() => toggle(f.key, f.enabled)} />
        </li>
      ))}
    </ul>
  );
}
