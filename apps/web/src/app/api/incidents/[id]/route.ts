import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { findSimilarPastIncidents } from "@/lib/incident-memory";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        repository: true,
        triggerNode: true,
        evidence: { include: { node: true }, orderBy: { score: "desc" } },
        statusHistory: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true, email: true } } } },
        fixProposal: true,
      },
    });
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

    await requireOrgRole(incident.repository.organizationId, "VIEWER");

    const similarIncidents = await findSimilarPastIncidents(id);

    return NextResponse.json({
      incident: {
        id: incident.id,
        status: incident.status,
        hypothesis: incident.hypothesis,
        proposedFix: incident.proposedFix,
        confidence: incident.confidence,
        abstainReason: incident.abstainReason,
        llmProvider: incident.llmProvider,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        trigger: {
          type: incident.triggerNode.type,
          externalId: incident.triggerNode.externalId,
          title: incident.triggerNode.title,
          url: incident.triggerNode.url,
        },
        evidence: incident.evidence.map((e) => ({
          score: e.score,
          node: { id: e.node.id, type: e.node.type, externalId: e.node.externalId, title: e.node.title, url: e.node.url },
        })),
        statusHistory: incident.statusHistory.map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          actor: h.actor?.name ?? h.actor?.email ?? "system",
          createdAt: h.createdAt,
        })),
        fixProposal: incident.fixProposal
          ? { id: incident.fixProposal.id, status: incident.fixProposal.status, summary: incident.fixProposal.summary, prUrl: incident.fixProposal.prUrl }
          : null,
        similarIncidents: similarIncidents.map((s) => ({
          id: s.id,
          status: s.status,
          triggerTitle: s.triggerTitle,
          similarity: s.similarity,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
