import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: repositoryId } = await context.params;
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    await requireOrgRole(repo.organizationId, "VIEWER");

    const nodes = await prisma.graphNode.findMany({
      where: { repositoryId },
      orderBy: { updatedAt: "desc" },
      take: 200, // enough for Phase 2's visualization; pagination is a Phase 3 concern once graphs are large
    });

    const edges = await prisma.graphEdge.findMany({
      where: { source: { repositoryId } },
      include: { source: { select: { id: true } }, target: { select: { id: true } } },
    });

    return NextResponse.json({
      repository: { id: repo.id, fullName: repo.fullName, lastIngestedAt: repo.lastIngestedAt },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        externalId: n.externalId,
        title: n.title,
        url: n.url,
        state: n.state,
        authorLogin: n.authorLogin,
        updatedAt: n.updatedAt,
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.sourceId, target: e.targetId, type: e.type })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
