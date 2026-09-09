import "server-only";
import { prisma } from "@/lib/prisma";
import { hybridRank, type RetrievableDocument } from "@/lib/retrieval";
import { getLLMProvider } from "@/lib/llm";
import type { EvidenceItem } from "@/lib/llm/types";
import { writeAuditLog } from "@/lib/audit";
import { verifyCitations, decideOutcome } from "@/lib/investigation-logic";
import { postToSlack } from "@/lib/slack";

const EVIDENCE_LIMIT = 8;

/**
 * The Phase 3 pipeline, as an explicit sequence of named steps — see
 * docs/ADR-004 for why this is a plain async pipeline rather than the
 * LangGraph library specifically:
 *
 *   1. detect   — the trigger node (an issue or a failed check run)
 *   2. retrieve — hybrid BM25 + vector search over the repo's graph (Phase 2)
 *   3. hypothesize — ask the configured LLM provider, or abstain
 *   4. verify   — every cited node id must be one we actually retrieved;
 *                 a model can't cite evidence it was never shown
 *   5. propose  — a confident, verified hypothesis becomes a fix proposal
 *                 awaiting human approval; nothing auto-applies anything
 */
export async function investigateNode(triggerNodeId: string): Promise<{ incidentId: string }> {
  const triggerNode = await prisma.graphNode.findUniqueOrThrow({
    where: { id: triggerNodeId },
    include: { repository: true },
  });

  const incident = await prisma.incident.create({
    data: { repositoryId: triggerNode.repositoryId, triggerNodeId, status: "INVESTIGATING" },
  });
  await recordTransition(incident.id, null, "INVESTIGATING", null, "Investigation started.");

  const candidates = await prisma.graphNode.findMany({
    where: { repositoryId: triggerNode.repositoryId, id: { not: triggerNodeId } },
    include: { embedding: true },
    take: 500, // Phase 2/3 scale — see docs/ADR-003 on why an in-memory rank is fine here
  });

  const queryText = [triggerNode.title, triggerNode.body].filter(Boolean).join("\n\n");
  const documents: RetrievableDocument[] = candidates.map((node) => ({
    id: node.id,
    text: [node.title, node.body].filter(Boolean).join("\n\n"),
    embedding: node.embedding?.vector ?? null,
  }));

  const ranked = hybridRank(queryText, documents).slice(0, EVIDENCE_LIMIT);
  const rankedNodesById = new Map(candidates.map((n) => [n.id, n]));

  const evidenceItems: EvidenceItem[] = ranked
    .map((r) => rankedNodesById.get(r.id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n) => ({ nodeId: n.id, type: n.type, externalId: n.externalId, title: n.title, body: n.body, score: 0 }));

  if (evidenceItems.length === 0) {
    return abstain(incident.id, "No related evidence was found in this repository's graph yet.");
  }

  const provider = getLLMProvider();
  const result = await provider.generateHypothesis({
    incidentSummary: `${triggerNode.type} #${triggerNode.externalId}: ${triggerNode.title ?? "(no title)"}`,
    evidence: evidenceItems,
  });

  if (!result.ok) {
    return abstain(incident.id, result.abstainReason ?? "The model declined to produce a hypothesis.", provider.id);
  }

  // Citation verification: reject any cited id the model wasn't actually
  // shown — this is what makes "cites the evidence" a checkable guarantee
  // rather than trusting the model's word for it.
  const validCitations = verifyCitations(
    result.citedNodeIds ?? [],
    evidenceItems.map((e) => e.nodeId),
  );

  if (validCitations.length === 0) {
    return abstain(incident.id, "The model's hypothesis did not cite any evidence it was actually shown.", provider.id);
  }

  const confidence = result.confidence ?? 0;
  const status = decideOutcome(confidence, validCitations.length);

  await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status,
      hypothesis: result.hypothesis,
      proposedFix: result.proposedFix,
      confidence,
      llmProvider: provider.id,
      abstainReason: status === "ABSTAINED" ? "Confidence was below the threshold for a fix proposal." : null,
      evidence: {
        create: validCitations.map((nodeId) => ({
          nodeId,
          score: ranked.find((r) => r.id === nodeId)?.score ?? 0,
        })),
      },
    },
  });
  await recordTransition(incident.id, "INVESTIGATING", status, null, `Hypothesis produced by ${provider.id} (confidence ${confidence.toFixed(2)}).`);

  if (status === "AWAITING_APPROVAL" && result.proposedFix) {
    await prisma.fixProposal.create({
      data: { incidentId: incident.id, summary: result.proposedFix },
    });
    await notifyOrgAdmins(triggerNode.repository.organizationId, incident.id, "A fix proposal is ready for review.");
  }

  return { incidentId: incident.id };
}

async function abstain(incidentId: string, reason: string, llmProvider?: string): Promise<{ incidentId: string }> {
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status: "ABSTAINED", abstainReason: reason, llmProvider },
  });
  await recordTransition(incidentId, "INVESTIGATING", "ABSTAINED", null, reason);
  return { incidentId };
}

async function recordTransition(
  incidentId: string,
  fromStatus: "INVESTIGATING" | "ABSTAINED" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | null,
  toStatus: "INVESTIGATING" | "ABSTAINED" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED",
  actorId: string | null,
  note: string,
) {
  await prisma.incidentStatusHistory.create({ data: { incidentId, fromStatus, toStatus, actorId, note } });
}

async function notifyOrgAdmins(organizationId: string, incidentId: string, title: string): Promise<void> {
  const [admins, org] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { slackWebhookUrl: true } }),
  ]);
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.userId,
      type: "incident.awaiting_approval",
      title,
      link: `/dashboard/incidents/${incidentId}`,
    })),
  });
  await writeAuditLog({ actorId: null, action: "incident.fix_proposal_created", targetType: "Incident", targetId: incidentId });

  // Best-effort — never allowed to affect the investigation pipeline's own
  // outcome. The in-app Notification rows above are the real source of
  // truth; this is a convenience mirror for teams that live in Slack.
  if (org?.slackWebhookUrl) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "";
    await postToSlack(org.slackWebhookUrl, `*Watchtower:* ${title}\n${baseUrl}/dashboard/incidents/${incidentId}`);
  }
}
