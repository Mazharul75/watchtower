"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Spinner } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface IncidentDTO {
  id: string;
  status: "INVESTIGATING" | "ABSTAINED" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED";
  hypothesis: string | null;
  proposedFix: string | null;
  confidence: number | null;
  abstainReason: string | null;
  llmProvider: string | null;
  createdAt: string;
  trigger: { type: string; externalId: string; title: string | null; url: string | null };
  evidence: { score: number; node: { id: string; type: string; externalId: string; title: string | null; url: string | null } }[];
  statusHistory: { fromStatus: string | null; toStatus: string; note: string | null; actor: string; createdAt: string }[];
  fixProposal: { id: string; status: "DRAFT" | "APPROVED" | "REJECTED"; summary: string; prUrl: string | null } | null;
  similarIncidents: { id: string; status: string; triggerTitle: string | null; similarity: number; createdAt: string }[];
}

export function IncidentDetail({ incidentId, canApprove }: { incidentId: string; canApprove: boolean }) {
  const [incident, setIncident] = useState<IncidentDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/incidents/${incidentId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setIncident(data.incident);
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve() {
    setBusy(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data.error ?? "Could not approve this fix.");
        return;
      }
      setActionMessage(`Draft PR opened: ${data.prUrl}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage(data.error ?? "Could not reject this fix.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!incident) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading incident…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--color-foreground-subtle)]">
          {incident.trigger.type} #{incident.trigger.externalId}
        </p>
        <h1 className="text-xl font-semibold">
          <a href={incident.trigger.url ?? undefined} target="_blank" rel="noreferrer" className="hover:underline">
            {incident.trigger.title ?? "(untitled)"}
          </a>
        </h1>
      </div>

      {incident.status === "ABSTAINED" ? (
        <Alert tone="warning">
          <strong>Watchtower abstained.</strong> {incident.abstainReason ?? "Not enough evidence to form a confident hypothesis."}
        </Alert>
      ) : (
        <>
          <div
            className="animate-fade-rise relative overflow-hidden rounded-2xl border p-6"
            style={{
              borderColor: "rgba(99, 102, 241, 0.25)",
              background: "linear-gradient(155deg, rgba(99,102,241,0.08), rgba(34,211,238,0.04))",
            }}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4338CA]">
                Why Watchtower thinks this happened
              </span>
              {incident.confidence != null && (
                <Badge tone={incident.confidence >= 0.7 ? "success" : "warning"}>
                  {incident.confidence >= 0.7 ? "High confidence" : "Moderate confidence"} · {Math.round(incident.confidence * 100)}%
                </Badge>
              )}
            </div>
            <p className="text-lg font-semibold leading-snug text-[var(--color-foreground)]">{incident.hypothesis ?? "—"}</p>
            {incident.proposedFix && (
              <p className="mt-3 border-t border-black/[0.06] pt-3 text-sm leading-relaxed text-[var(--color-foreground-muted)]">
                <span className="font-medium text-[var(--color-foreground)]">Proposed approach: </span>
                {incident.proposedFix}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-foreground-subtle)]">CITED EVIDENCE</h2>
              {incident.evidence.length > 0 && (
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-[var(--color-foreground-subtle)]">
                  {incident.evidence.length} clickable source{incident.evidence.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {incident.evidence.map((e, i) => (
                <li
                  key={e.node.id}
                  className="glass-card flex items-center justify-between gap-3 rounded-lg p-3 text-sm"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <a href={e.node.url ?? undefined} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline">
                    {e.node.type} #{e.node.externalId} — {e.node.title ?? "(untitled)"}
                  </a>
                  <span className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">{Math.round(e.score * 100)}% relevance</span>
                </li>
              ))}
              {incident.evidence.length === 0 && <p className="text-sm text-[var(--color-foreground-muted)]">None.</p>}
            </ul>
          </div>
        </>
      )}

      {incident.similarIncidents.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-foreground-subtle)]">SIMILAR PAST INCIDENTS</h2>
          <ul className="flex flex-col gap-2">
            {incident.similarIncidents.map((s) => (
              <li key={s.id} className="glass-card flex items-center justify-between rounded-lg p-3 text-sm">
                <Link href={`/dashboard/incidents/${s.id}`} className="min-w-0 truncate hover:underline">
                  {s.triggerTitle ?? "(untitled)"}
                </Link>
                <span className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">
                  {Math.round(s.similarity * 100)}% similar
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incident.fixProposal && (
        <div className="glass-card rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-foreground-subtle)]">FIX PROPOSAL</h2>
            <Badge tone={incident.fixProposal.status === "APPROVED" ? "success" : incident.fixProposal.status === "REJECTED" ? "danger" : "warning"}>
              {incident.fixProposal.status.toLowerCase()}
            </Badge>
          </div>

          {actionMessage && <Alert tone="info">{actionMessage}</Alert>}

          {incident.fixProposal.prUrl && (
            <p className="mt-2 text-sm">
              <a href={incident.fixProposal.prUrl} target="_blank" rel="noreferrer" className="text-[var(--color-link)] hover:underline">
                View draft pull request →
              </a>
            </p>
          )}

          {incident.fixProposal.status === "DRAFT" && canApprove && (
            <div className="mt-4 flex gap-3">
              <Button onClick={approve} disabled={busy}>
                {busy && <Spinner />}
                Approve — open draft PR
              </Button>
              <Button variant="outline" onClick={reject} disabled={busy}>
                Reject
              </Button>
            </div>
          )}
          {incident.fixProposal.status === "DRAFT" && !canApprove && (
            <p className="mt-3 text-xs text-[var(--color-foreground-subtle)]">Only an org owner or admin can approve this.</p>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-[var(--color-foreground-subtle)]">HISTORY</h2>
        <ul className="flex flex-col gap-2 text-xs text-[var(--color-foreground-muted)]">
          {incident.statusHistory.map((h, i) => (
            <li key={i}>
              <span className="text-[var(--color-foreground-subtle)]">{new Date(h.createdAt).toLocaleString()}</span> — {h.actor}:{" "}
              {h.toStatus.toLowerCase()} {h.note && `(${h.note})`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
