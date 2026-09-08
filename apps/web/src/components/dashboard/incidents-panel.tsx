"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Spinner, Alert } from "@/components/ui/alert";

interface IncidentDTO {
  id: string;
  status: "INVESTIGATING" | "ABSTAINED" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED";
  confidence: number | null;
  createdAt: string;
  trigger: { type: string; externalId: string; title: string | null };
  fixProposalStatus: string | null;
}

const STATUS_TONE: Record<IncidentDTO["status"], "info" | "warning" | "success" | "danger"> = {
  INVESTIGATING: "info",
  ABSTAINED: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const STATUS_LABEL: Record<IncidentDTO["status"], string> = {
  INVESTIGATING: "investigating",
  ABSTAINED: "abstained — insufficient evidence",
  AWAITING_APPROVAL: "awaiting approval",
  APPROVED: "fix approved",
  REJECTED: "fix rejected",
};

export function IncidentsPanel({ repositoryId, refreshKey }: { repositoryId: string; refreshKey?: number }) {
  const [incidents, setIncidents] = useState<IncidentDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/repos/${repositoryId}/incidents`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setIncidents(data.incidents);
      });
  }, [repositoryId, refreshKey]);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!incidents) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading incidents…
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
        No investigations yet. Click &ldquo;Investigate&rdquo; on an issue or check run below, or wait for a CI
        failure to auto-trigger one (if enabled).
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {incidents.map((incident) => (
        <li key={incident.id} className="flex items-center justify-between py-3">
          <Link href={`/dashboard/incidents/${incident.id}`} className="min-w-0 hover:opacity-80">
            <p className="truncate font-medium text-[var(--color-foreground)]">
              {incident.trigger.type} #{incident.trigger.externalId} — {incident.trigger.title ?? "(untitled)"}
            </p>
            <p className="text-xs text-[var(--color-foreground-subtle)]">
              {new Date(incident.createdAt).toLocaleString()}
              {incident.confidence != null && ` · ${Math.round(incident.confidence * 100)}% confidence`}
            </p>
          </Link>
          <Badge tone={STATUS_TONE[incident.status]}>{STATUS_LABEL[incident.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}
