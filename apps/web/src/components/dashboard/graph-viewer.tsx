"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Spinner } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NodeGraphVisualization } from "@/components/dashboard/node-graph-visualization";

interface GraphNodeDTO {
  id: string;
  type: "ISSUE" | "PULL_REQUEST" | "CHECK_RUN" | "COMMIT";
  externalId: string;
  title: string | null;
  url: string | null;
  state: string | null;
  authorLogin: string | null;
  updatedAt: string;
}

interface GraphEdgeDTO {
  id: string;
  source: string;
  target: string;
  type: "FIXES" | "REFERENCES" | "PART_OF";
}

const TYPE_LABEL: Record<GraphNodeDTO["type"], string> = {
  ISSUE: "Issue",
  PULL_REQUEST: "Pull request",
  CHECK_RUN: "Check run",
  COMMIT: "Commit",
};

const STATE_TONE: Record<string, "success" | "danger" | "warning" | "info"> = {
  open: "info",
  closed: "success",
  merged: "success",
  success: "success",
  failure: "danger",
  pending: "warning",
};

const INVESTIGABLE_TYPES: GraphNodeDTO["type"][] = ["ISSUE", "CHECK_RUN"];

function edgeLabel(type: GraphEdgeDTO["type"]): string {
  if (type === "FIXES") return "fixes";
  if (type === "PART_OF") return "part of";
  return "references";
}

export function GraphViewer({ repositoryId, canInvestigate }: { repositoryId: string; canInvestigate: boolean }) {
  const router = useRouter();
  const [nodes, setNodes] = useState<GraphNodeDTO[] | null>(null);
  const [edges, setEdges] = useState<GraphEdgeDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [view, setView] = useState<"graph" | "list">("graph");

  useEffect(() => {
    fetch(`/api/repos/${repositoryId}/graph`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setNodes(data.nodes);
        setEdges(data.edges);
      });
  }, [repositoryId]);

  async function investigate(nodeId: string) {
    setInvestigatingId(nodeId);
    try {
      const res = await fetch(`/api/repos/${repositoryId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerNodeId: nodeId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/incidents/${data.incidentId}`);
      } else {
        setError(data.error ?? "Could not start investigation.");
      }
    } finally {
      setInvestigatingId(null);
    }
  }

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!nodes) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
        <Spinner /> Loading graph…
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
        Nothing ingested yet. Once GitHub sends a webhook for this repo — a new issue, PR, or check run — its node
        appears here automatically.
      </div>
    );
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const outgoingByNode = new Map<string, GraphEdgeDTO[]>();
  for (const edge of edges) {
    const list = outgoingByNode.get(edge.source) ?? [];
    list.push(edge);
    outgoingByNode.set(edge.source, list);
  }

  const grouped = nodes.reduce<Record<string, GraphNodeDTO[]>>((acc, node) => {
    (acc[node.type] ??= []).push(node);
    return acc;
  }, {});

  const viewToggle = (
    <div className="mb-4 flex justify-end gap-1 rounded-lg border border-[var(--color-border)] bg-black/10 p-1">
      <button
        type="button"
        onClick={() => setView("graph")}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          view === "graph" ? "bg-white/10 text-[var(--color-foreground)]" : "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]"
        }`}
      >
        Graph view
      </button>
      <button
        type="button"
        onClick={() => setView("list")}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          view === "list" ? "bg-white/10 text-[var(--color-foreground)]" : "text-[var(--color-foreground-subtle)] hover:text-[var(--color-foreground)]"
        }`}
      >
        List view
      </button>
    </div>
  );

  if (view === "graph") {
    return (
      <div>
        {viewToggle}
        <NodeGraphVisualization
          nodes={nodes}
          edges={edges}
          canInvestigate={canInvestigate}
          investigatingId={investigatingId}
          onInvestigate={investigate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {viewToggle}
      {(Object.keys(TYPE_LABEL) as GraphNodeDTO["type"][])
        .filter((type) => grouped[type]?.length)
        .map((type) => (
          <div key={type}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-foreground-subtle)]">
              {TYPE_LABEL[type]}s ({grouped[type]!.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {grouped[type]!.map((node) => {
                const relationships = outgoingByNode.get(node.id) ?? [];
                return (
                  <li key={node.id} className="glass-card rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <a
                          href={node.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[var(--color-foreground)] hover:underline"
                        >
                          #{node.externalId} {node.title ?? <span className="italic text-[var(--color-foreground-subtle)]">(not yet fetched)</span>}
                        </a>
                        {node.authorLogin && (
                          <p className="mt-0.5 text-xs text-[var(--color-foreground-subtle)]">by {node.authorLogin}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {node.state && <Badge tone={STATE_TONE[node.state] ?? "info"}>{node.state}</Badge>}
                        {canInvestigate && INVESTIGABLE_TYPES.includes(node.type) && (
                          <Button variant="outline" size="sm" onClick={() => investigate(node.id)} disabled={investigatingId === node.id}>
                            {investigatingId === node.id ? <Spinner /> : "Investigate"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {relationships.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--color-foreground-muted)]">
                        {relationships.map((edge) => {
                          const target = nodesById.get(edge.target);
                          return (
                            <li key={edge.id} className="rounded-full bg-white/5 px-2.5 py-1">
                              {edgeLabel(edge.type)} {target ? `${TYPE_LABEL[target.type].toLowerCase()} #${target.externalId}` : "…"}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </div>
  );
}
