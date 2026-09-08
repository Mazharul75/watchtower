"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Spinner } from "@/components/ui/alert";

interface Repo {
  id: string;
  fullName: string;
  connectedAt: string;
  lastIngestedAt: string | null;
  nodeCount: number;
}

export function ReposPanel({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orgs/${organizationId}/repos`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setRepos(data.repositories);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function disconnect(id: string) {
    setBusyId(id);
    await fetch(`/api/repos/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <ButtonLink href={`/api/github/install?organizationId=${organizationId}`} size="sm">
            + Connect a repository
          </ButtonLink>
        </div>
      )}

      {!repos ? (
        <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <Spinner /> Loading repositories…
        </div>
      ) : repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
          No repositories connected yet.
          {!canManage && " Ask an org owner or admin to connect one."}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {repos.map((repo) => (
            <li key={repo.id} className="flex items-center justify-between py-3">
              <div>
                <Link href={`/dashboard/repos/${repo.id}`} className="font-medium text-[var(--color-foreground)] hover:opacity-80">
                  {repo.fullName}
                </Link>
                <p className="text-xs text-[var(--color-foreground-subtle)]">
                  {repo.nodeCount} graph node{repo.nodeCount === 1 ? "" : "s"} ·{" "}
                  {repo.lastIngestedAt ? `last ingested ${new Date(repo.lastIngestedAt).toLocaleString()}` : "not ingested yet"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="success">connected</Badge>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => disconnect(repo.id)} disabled={busyId === repo.id}>
                    {busyId === repo.id ? <Spinner /> : "Disconnect"}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
