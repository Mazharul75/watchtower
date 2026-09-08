"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Spinner, Alert } from "@/components/ui/alert";

interface SessionRow {
  id: string;
  createdAt: string;
  expires: string;
  userAgent: string | null;
  ipAddress: string | null;
  current: boolean;
}

export function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/account/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(data.sessions);
    } catch {
      setError("Could not load sessions.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(id: string) {
    setBusyId(id);
    await fetch(`/api/account/sessions/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  async function revokeAll() {
    setBusyId("all");
    await fetch("/api/account/sessions/revoke-all", { method: "POST" });
    await load();
    setBusyId(null);
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!sessions) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading sessions…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={revokeAll} disabled={busyId === "all" || sessions.length <= 1}>
          {busyId === "all" && <Spinner />}
          Log out of all other devices
        </Button>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                {s.userAgent ? s.userAgent.slice(0, 60) : "Unknown device"}
                {s.current && <Badge tone="success">This device</Badge>}
              </p>
              <p className="text-xs text-[var(--color-foreground-subtle)]">
                {s.ipAddress ?? "Unknown IP"} · signed in {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            {!s.current && (
              <Button variant="ghost" size="sm" onClick={() => revoke(s.id)} disabled={busyId === s.id}>
                {busyId === s.id ? <Spinner /> : "Revoke"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
