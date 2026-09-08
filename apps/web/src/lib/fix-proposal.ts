import "server-only";
import { prisma } from "@/lib/prisma";
import { getInstallationOctokit } from "@/lib/github-app";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/rbac-errors";

/**
 * Approving a fix proposal is the ONLY code path that can open a pull
 * request — see docs/ADR-004 for why its content is a Markdown incident
 * report rather than generated code, and why that's still a real,
 * structurally-enforced human approval gate.
 */
export async function approveFixProposal(fixProposalId: string, approverId: string): Promise<{ prUrl: string }> {
  const proposal = await prisma.fixProposal.findUniqueOrThrow({
    where: { id: fixProposalId },
    include: { incident: { include: { repository: true, triggerNode: true, evidence: { include: { node: true } } } } },
  });

  if (proposal.status !== "DRAFT") {
    throw new Error(`This fix proposal is already ${proposal.status.toLowerCase()}.`);
  }

  const { incident } = proposal;
  const { repository } = incident;
  const octokit = await getInstallationOctokit(repository.installationId);

  const branchName = `watchtower/incident-${incident.id}`;
  const { data: refData } = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
    owner: repository.owner,
    repo: repository.name,
    ref: `heads/${repository.defaultBranch ?? "main"}`,
  });
  const baseSha = refData.object.sha;

  await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
    owner: repository.owner,
    repo: repository.name,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  const reportPath = `WATCHTOWER_INCIDENT_${incident.id}.md`;
  const reportContent = buildIncidentReportMarkdown(incident);

  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner: repository.owner,
    repo: repository.name,
    path: reportPath,
    message: `Watchtower: incident report for ${incident.triggerNode.type} #${incident.triggerNode.externalId}`,
    content: Buffer.from(reportContent, "utf-8").toString("base64"),
    branch: branchName,
  });

  const { data: pr } = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
    owner: repository.owner,
    repo: repository.name,
    title: `Watchtower: possible fix for ${incident.triggerNode.type} #${incident.triggerNode.externalId}`,
    head: branchName,
    base: repository.defaultBranch ?? "main",
    body: reportContent,
    draft: true,
  });

  await prisma.$transaction([
    prisma.fixProposal.update({
      where: { id: fixProposalId },
      data: { status: "APPROVED", prUrl: pr.html_url, prBranch: branchName, approvedById: approverId, approvedAt: new Date() },
    }),
    prisma.incident.update({ where: { id: incident.id }, data: { status: "APPROVED", resolvedAt: new Date() } }),
    prisma.incidentStatusHistory.create({
      data: { incidentId: incident.id, fromStatus: "AWAITING_APPROVAL", toStatus: "APPROVED", actorId: approverId, note: `Draft PR opened: ${pr.html_url}` },
    }),
  ]);

  await writeAuditLog({
    actorId: approverId,
    action: "incident.fix_approved",
    targetType: "Incident",
    targetId: incident.id,
    metadata: { prUrl: pr.html_url },
  });

  return { prUrl: pr.html_url };
}

export async function rejectFixProposal(fixProposalId: string, actorId: string, note?: string): Promise<void> {
  const proposal = await prisma.fixProposal.findUniqueOrThrow({ where: { id: fixProposalId } });
  if (proposal.status !== "DRAFT") {
    throw new ForbiddenError(`This fix proposal is already ${proposal.status.toLowerCase()}.`);
  }

  await prisma.$transaction([
    prisma.fixProposal.update({ where: { id: fixProposalId }, data: { status: "REJECTED" } }),
    prisma.incident.update({ where: { id: proposal.incidentId }, data: { status: "REJECTED", resolvedAt: new Date() } }),
    prisma.incidentStatusHistory.create({
      data: { incidentId: proposal.incidentId, fromStatus: "AWAITING_APPROVAL", toStatus: "REJECTED", actorId, note },
    }),
  ]);

  await writeAuditLog({ actorId, action: "incident.fix_rejected", targetType: "Incident", targetId: proposal.incidentId });
}

interface IncidentForReport {
  id: string;
  hypothesis: string | null;
  proposedFix: string | null;
  confidence: number | null;
  triggerNode: { type: string; externalId: string; title: string | null; url: string | null };
  evidence: { node: { type: string; externalId: string; title: string | null; url: string | null } }[];
}

export function buildIncidentReportMarkdown(incident: IncidentForReport): string {
  const evidenceList = incident.evidence
    .map((e) => `- [${e.node.type} #${e.node.externalId}](${e.node.url ?? "#"}) — ${e.node.title ?? "(untitled)"}`)
    .join("\n");

  return `# Watchtower incident report

**Trigger:** [${incident.triggerNode.type} #${incident.triggerNode.externalId}](${incident.triggerNode.url ?? "#"}) — ${incident.triggerNode.title ?? "(untitled)"}
**Confidence:** ${incident.confidence != null ? Math.round(incident.confidence * 100) + "%" : "unknown"}

## Hypothesis

${incident.hypothesis ?? "_No hypothesis available._"}

## Proposed approach

${incident.proposedFix ?? "_No fix proposed._"}

## Cited evidence

${evidenceList || "_None._"}

---
This report was opened as a draft PR by Watchtower and requires human review before any change is merged. It does not contain a generated code fix — build the actual fix on this branch.
`;
}
