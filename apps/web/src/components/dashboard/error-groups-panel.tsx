"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Spinner, Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface GroupDTO {
  id: string;
  title: string;
  level: "ERROR" | "WARNING" | "INFO";
  environment: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
  muted: boolean;
}

const LEVEL_TONE: Record<GroupDTO["level"], "danger" | "warning" | "info"> = {
  ERROR: "danger",
  WARNING: "warning",
  INFO: "info",
};

export function ErrorGroupsPanel({ organizationId, projectId }: { organizationId: string; projectId: string }) {
  const [showResolved, setShowResolved] = useState(false);
  const [groups, setGroups] = useState<GroupDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroups(null);
    fetch(`/api/ingest-projects/${projectId}/groups?resolved=${showResolved}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGroups(data.groups);
      });
  }, [projectId, showResolved]);

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-1 rounded-lg border border-[var(--color-border)] bg-black/[0.03] p-1">
        <Button
          type="button"
          variant={showResolved ? "ghost" : "secondary"}
          size="sm"
          onClick={() => setShowResolved(false)}
        >
          Unresolved
        </Button>
        <Button type="button" variant={showResolved ? "secondary" : "ghost"} size="sm" onClick={() => setShowResolved(true)}>
          Resolved
        </Button>
      </div>

      {!groups ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          {showResolved ? "Nothing resolved yet." : "No errors reported yet — once the snippet is live, they'll show up here automatically."}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-3">
              <Link href={`/dashboard/orgs/${organizationId}/errors/${projectId}/${g.id}`} className="min-w-0 hover:opacity-80">
                <p className="truncate font-medium text-[var(--color-foreground)]">{g.title}</p>
                <p className="text-xs text-[var(--color-foreground-subtle)]">
                  {g.environment} · last seen {new Date(g.lastSeenAt).toLocaleString()}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-[var(--color-foreground-subtle)]">×{g.count}</span>
                <Badge tone={LEVEL_TONE[g.level]}>{g.level.toLowerCase()}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
