"use client";

import { useEffect, useState } from "react";
import { Spinner, Alert, Badge } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

interface AuditLogRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
}

function toneFor(action: string): "danger" | "warning" | "info" | "success" {
  if (action.startsWith("admin.impersonate")) return "danger";
  if (action.includes("password_reset") || action.includes("revoked")) return "warning";
  if (action.includes("created") || action.includes("verified")) return "success";
  return "info";
}

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setLogs(data.logs);
      });
  }, []);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!logs) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading audit log…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ButtonLink href="/api/admin/audit-logs/export" variant="outline" size="sm">
          Export CSV
        </ButtonLink>
      </div>
      <ul className="flex flex-col gap-3">
        {logs.map((log) => (
        <li key={log.id} className="flex items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] p-3 text-sm">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge tone={toneFor(log.action)}>{log.action}</Badge>
              {log.targetType && <span className="text-xs text-[var(--color-foreground-subtle)]">{log.targetType}{log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}</span>}
            </div>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {log.actor ? `${log.actor.name ?? log.actor.email}` : "system"} {log.ipAddress ? `· ${log.ipAddress}` : ""}
            </p>
          </div>
          <time className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">{new Date(log.createdAt).toLocaleString()}</time>
        </li>
        ))}
      </ul>
    </div>
  );
}
