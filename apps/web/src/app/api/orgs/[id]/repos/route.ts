import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    await requireOrgRole(organizationId, "VIEWER");

    const repos = await prisma.repository.findMany({
      where: { organizationId },
      orderBy: { connectedAt: "desc" },
      include: { _count: { select: { nodes: true } } },
    });

    return NextResponse.json({
      repositories: repos.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        connectedAt: r.connectedAt,
        lastIngestedAt: r.lastIngestedAt,
        nodeCount: r._count.nodes,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
