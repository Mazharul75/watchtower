"use client";

import { useMemo, useState } from "react";

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

const COLUMN_ORDER: GraphNodeDTO["type"][] = ["ISSUE", "PULL_REQUEST", "COMMIT", "CHECK_RUN"];
const COLUMN_LABEL: Record<GraphNodeDTO["type"], string> = {
  ISSUE: "Issues",
  PULL_REQUEST: "Pull requests",
  COMMIT: "Commits",
  CHECK_RUN: "CI checks",
};
// `text` is a dark, saturated variant of each hue — the light-theme inverse
// of what a dark canvas needs (there, a pastel reads on a dark tint; here,
// a pale tinted `fill` needs dark text on top of it for contrast).
const TYPE_ACCENT: Record<GraphNodeDTO["type"], { stroke: string; fill: string; text: string }> = {
  ISSUE: { stroke: "#f43f5e", fill: "rgba(244, 63, 94, 0.10)", text: "#b91c3c" },
  PULL_REQUEST: { stroke: "#10b981", fill: "rgba(16, 185, 129, 0.10)", text: "#047857" },
  COMMIT: { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.10)", text: "#0369a1" },
  CHECK_RUN: { stroke: "#94a3b8", fill: "rgba(148, 163, 184, 0.14)", text: "#475569" },
};
const EDGE_LABEL: Record<GraphEdgeDTO["type"], string> = {
  FIXES: "fixes",
  REFERENCES: "references",
  PART_OF: "part of",
};

const COL_WIDTH = 260;
const BOX_WIDTH = 208;
const BOX_HEIGHT = 60;
const ROW_GAP = 96;
const PAD = 40;
const MAX_RENDERED = 60;

interface Positioned extends GraphNodeDTO {
  x: number;
  y: number;
}

export function NodeGraphVisualization({
  nodes,
  edges,
  canInvestigate,
  investigatingId,
  onInvestigate,
}: {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  canInvestigate: boolean;
  investigatingId: string | null;
  onInvestigate: (nodeId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const shown = nodes.slice(0, MAX_RENDERED);
  const hiddenCount = nodes.length - shown.length;

  const { positioned, width, height } = useMemo(() => {
    const byType = new Map<GraphNodeDTO["type"], GraphNodeDTO[]>();
    for (const t of COLUMN_ORDER) byType.set(t, []);
    for (const n of shown) byType.get(n.type)?.push(n);

    const activeColumns = COLUMN_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0);
    const maxRows = Math.max(1, ...activeColumns.map((t) => byType.get(t)!.length));

    const positioned: Positioned[] = [];
    activeColumns.forEach((type, colIndex) => {
      const colNodes = byType.get(type)!;
      const verticalOffset = ((maxRows - colNodes.length) * ROW_GAP) / 2;
      colNodes.forEach((node, rowIndex) => {
        positioned.push({
          ...node,
          x: PAD + colIndex * COL_WIDTH,
          y: PAD + verticalOffset + rowIndex * ROW_GAP,
        });
      });
    });

    const width = PAD * 2 + Math.max(1, activeColumns.length) * COL_WIDTH - (COL_WIDTH - BOX_WIDTH);
    const height = PAD * 2 + maxRows * ROW_GAP - (ROW_GAP - BOX_HEIGHT);
    return { positioned, width: Math.max(width, 400), height: Math.max(height, 200) };
  }, [shown]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
        Nothing ingested yet. Once GitHub sends a webhook for this repo — a new issue, PR, or check run — its node
        appears here automatically.
      </div>
    );
  }

  const byId = new Map(positioned.map((n) => [n.id, n]));
  const visibleEdges = edges.filter((e) => byId.has(e.source) && byId.has(e.target));

  const connectedTo = (id: string) => {
    const set = new Set<string>();
    for (const e of visibleEdges) {
      if (e.source === id) set.add(e.target);
      if (e.target === id) set.add(e.source);
    }
    return set;
  };
  const highlighted = hoveredId ? connectedTo(hoveredId) : null;

  return (
    <div className="flex flex-col gap-3">
      {hiddenCount > 0 && (
        <p className="text-xs text-[var(--color-foreground-subtle)]">
          Showing the most recent {MAX_RENDERED} of {nodes.length} nodes. Switch to List view below to see the rest.
        </p>
      )}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--color-foreground-subtle)]">
        {COLUMN_ORDER.filter((t) => shown.some((n) => n.type === t)).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TYPE_ACCENT[t].stroke }} />
            {COLUMN_LABEL[t]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-black/[0.025] p-2">
        <svg width={width} height={height} className="block">
          <defs>
            <marker id="wt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8" />
            </marker>
          </defs>

          {visibleEdges.map((edge, i) => {
            const s = byId.get(edge.source)!;
            const t = byId.get(edge.target)!;
            const sx = s.x + BOX_WIDTH;
            const sy = s.y + BOX_HEIGHT / 2;
            const tx = t.x;
            const ty = t.y + BOX_HEIGHT / 2;
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;
            const dimmed = highlighted && !(highlighted.has(edge.source) || edge.source === hoveredId) && !(highlighted.has(edge.target) || edge.target === hoveredId);
            const label = EDGE_LABEL[edge.type];
            const labelWidth = label.length * 5.6 + 10;
            return (
              <g key={edge.id} opacity={dimmed ? 0.15 : 1} style={{ transition: "opacity 0.2s ease" }}>
                <path
                  d={`M ${sx} ${sy} C ${sx + 40} ${sy}, ${tx - 40} ${ty}, ${tx} ${ty}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.4"
                  markerEnd="url(#wt-arrow)"
                  style={{ animation: `wt-edge-draw 0.6s ease-out both`, animationDelay: `${i * 30}ms` }}
                />
                <rect x={midX - labelWidth / 2} y={midY - 9} width={labelWidth} height="16" rx="4" fill="#F1F3F5" />
                <text x={midX} y={midY + 3} textAnchor="middle" fontSize="10" fill="#475569">
                  {label}
                </text>
              </g>
            );
          })}

          {positioned.map((node, i) => {
            const accent = TYPE_ACCENT[node.type];
            const dimmed = highlighted && node.id !== hoveredId && !highlighted.has(node.id);
            return (
              // Positioning lives on this OUTER group as a plain SVG
              // `transform` attribute and must stay untouched by CSS — a
              // CSS `transform` animation on the same element would replace
              // (not compose with) the attribute and collapse every node to
              // the origin. The entrance animation instead runs on the
              // INNER group below, which has no attribute transform to clobber.
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <g
                  opacity={dimmed ? 0.3 : 1}
                  style={{ transition: "opacity 0.2s ease", animation: "wt-node-in 0.4s ease-out both", animationDelay: `${i * 25}ms`, cursor: "pointer" }}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => node.url && window.open(node.url, "_blank", "noopener,noreferrer")}
                >
                  <rect width={BOX_WIDTH} height={BOX_HEIGHT} rx="10" fill={accent.fill} stroke={accent.stroke} strokeWidth="1.3" />
                  <text x="12" y="22" fontSize="11" fontWeight="600" fill={accent.text}>
                    {node.type === "PULL_REQUEST" ? "PR" : node.type === "CHECK_RUN" ? "Check" : node.type === "COMMIT" ? "Commit" : "Issue"} #{node.externalId.slice(0, 8)}
                  </text>
                  <text x="12" y="40" fontSize="11" fill="#1f2937">
                    {(node.title ?? "(not yet fetched)").slice(0, 30)}
                    {(node.title?.length ?? 0) > 30 ? "…" : ""}
                  </text>
                  {canInvestigate && (node.type === "ISSUE" || node.type === "CHECK_RUN") && (
                    <foreignObject x={BOX_WIDTH - 30} y="6" width="24" height="24">
                      <button
                        type="button"
                        title="Investigate"
                        aria-label="Investigate"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInvestigate(node.id);
                        }}
                        disabled={investigatingId === node.id}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/[0.06] text-[10px] text-[var(--color-foreground)] hover:bg-black/10"
                      >
                        {investigatingId === node.id ? "…" : "🔍"}
                      </button>
                    </foreignObject>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <style>{`
        @keyframes wt-node-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes wt-edge-draw { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          svg g { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
