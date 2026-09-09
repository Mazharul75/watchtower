"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Spinner } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EventDTO {
  id: string;
  message: string;
  stackTrace: string | null;
  url: string | null;
  userAgent: string | null;
  release: string | null;
  receivedAt: string;
}

interface GroupDetailDTO {
  id: string;
  title: string;
  level: "ERROR" | "WARNING" | "INFO";
  environment: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  project: { id: string; name: string };
  events: EventDTO[];
}

const LEVEL_TONE: Record<GroupDetailDTO["level"], "danger" | "warning" | "info"> = {
  ERROR: "danger",
  WARNING: "warning",
  INFO: "info",
};

export function ErrorGroupDetail({ groupId, canResolve }: { groupId: string; canResolve: boolean }) {
  const [group, setGroup] = useState<GroupDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/error-groups/${groupId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setGroup(data.group);
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleResolved() {
    if (!group) return;
    setBusy(true);
    try {
      await fetch(`/api/error-groups/${groupId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolve: !group.resolvedAt }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!group) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={LEVEL_TONE[group.level]}>{group.level.toLowerCase()}</Badge>
          <Badge tone="info">{group.environment}</Badge>
          {group.resolvedAt && <Badge tone="success">resolved</Badge>}
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">{group.title}</h1>
        <p className="mt-1 text-sm text-[var(--color-foreground-subtle)]">
          {group.count} occurrence{group.count === 1 ? "" : "s"} · first seen {new Date(group.firstSeenAt).toLocaleString()} · last seen{" "}
          {new Date(group.lastSeenAt).toLocaleString()}
        </p>
      </div>

      {canResolve && (
        <div>
          <Button variant={group.resolvedAt ? "outline" : "primary"} size="sm" onClick={toggleResolved} disabled={busy}>
            {busy && <Spinner />}
            {group.resolvedAt ? "Reopen" : "Mark resolved"}
          </Button>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-foreground-subtle)]">RECENT OCCURRENCES</h2>
        <ul className="flex flex-col gap-2">
          {group.events.map((e) => {
            const expanded = expandedEventId === e.id;
            return (
              <li key={e.id} className="glass-card rounded-lg p-3">
                <button type="button" onClick={() => setExpandedEventId(expanded ? null : e.id)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="min-w-0 truncate text-sm text-[var(--color-foreground)]">{new Date(e.receivedAt).toLocaleString()}</span>
                  {e.url && <span className="shrink-0 truncate text-xs text-[var(--color-foreground-subtle)]">{e.url}</span>}
                </button>
                {expanded && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border)] pt-2 text-xs">
                    {e.release && <p className="text-[var(--color-foreground-muted)]">Release: {e.release}</p>}
                    {e.userAgent && <p className="truncate text-[var(--color-foreground-muted)]">{e.userAgent}</p>}
                    {e.stackTrace && (
                      <pre className="overflow-x-auto rounded-lg bg-[#0F172A] p-3 text-[11px] leading-relaxed text-slate-100">
                        <code>{e.stackTrace}</code>
                      </pre>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
