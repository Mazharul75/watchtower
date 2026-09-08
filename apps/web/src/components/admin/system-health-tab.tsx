"use client";

import { useEffect, useState } from "react";
import { Badge, Spinner, Alert } from "@/components/ui/alert";

interface SystemHealth {
  users: { total: number; suspended: number };
  organizations: number;
  repositories: number;
  activeSessions: number;
  incidents: {
    byStatus: { status: string; count: number }[];
    byProvider: { provider: string; count: number }[];
  };
  webhooks: { total: number; errored: number; unprocessed: number };
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-2xl font-semibold text-[var(--color-foreground)]">{value}</p>
      <p className="text-xs text-[var(--color-foreground-subtle)]">{label}</p>
    </div>
  );
}

export function SystemHealthTab() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/system-health")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setHealth(data);
      });
  }, []);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!health) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading system health…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={health.users.total} />
        <StatCard label="Suspended" value={health.users.suspended} />
        <StatCard label="Organizations" value={health.organizations} />
        <StatCard label="Connected repos" value={health.repositories} />
        <StatCard label="Active sessions" value={health.activeSessions} />
        <StatCard label="Webhooks received" value={health.webhooks.total} />
        <StatCard label="Webhook errors" value={health.webhooks.errored} />
        <StatCard label="Unprocessed webhooks" value={health.webhooks.unprocessed} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
          Incidents by status
        </h3>
        <div className="flex flex-wrap gap-2">
          {health.incidents.byStatus.length === 0 && <p className="text-sm text-[var(--color-foreground-muted)]">None yet.</p>}
          {health.incidents.byStatus.map((s) => (
            <Badge key={s.status} tone="info">
              {s.status.toLowerCase()}: {s.count}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
          Investigations by LLM provider
        </h3>
        <p className="mb-2 text-xs text-[var(--color-foreground-subtle)]">
          Ollama and any self-hosted provider cost nothing per call; only a provider that charges per token (e.g.
          Anthropic) has a real cost here.
        </p>
        <div className="flex flex-wrap gap-2">
          {health.incidents.byProvider.length === 0 && <p className="text-sm text-[var(--color-foreground-muted)]">None yet.</p>}
          {health.incidents.byProvider.map((p) => (
            <Badge key={p.provider} tone={p.provider.includes("abstain") ? "warning" : "success"}>
              {p.provider}: {p.count}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
