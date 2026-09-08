import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { investigateNode } from "@/lib/investigation";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: repositoryId } = await context.params;
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

    await requireOrgRole(repo.organizationId, "VIEWER");

    const incidents = await prisma.incident.findMany({
      where: { repositoryId },
      orderBy: { createdAt: "desc" },
      include: { triggerNode: { select: { type: true, externalId: true, title: true } }, fixProposal: { select: { status: true } } },
    });

    return NextResponse.json({
      incidents: incidents.map((i) => ({
        id: i.id,
        status: i.status,
        confidence: i.confidence,
        createdAt: i.createdAt,
        trigger: i.triggerNode,
        fixProposalStatus: i.fixProposal?.status ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: repositoryId } = await context.params;
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

    await requireOrgRole(repo.organizationId, "MEMBER");

    const body = await request.json().catch(() => null);
    const triggerNodeId = body?.triggerNodeId as string | undefined;
    if (!triggerNodeId) {
      return NextResponse.json({ error: "triggerNodeId is required" }, { status: 400 });
    }

    const node = await prisma.graphNode.findUnique({ where: { id: triggerNodeId } });
    if (!node || node.repositoryId !== repositoryId) {
      return NextResponse.json({ error: "That node does not belong to this repository." }, { status: 400 });
    }

    const { incidentId } = await investigateNode(triggerNodeId);
    return NextResponse.json({ incidentId }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
