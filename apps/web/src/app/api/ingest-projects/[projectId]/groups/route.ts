import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    const project = await prisma.ingestProject.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    await requireOrgRole(project.organizationId, "VIEWER");

    const showResolved = new URL(request.url).searchParams.get("resolved") === "true";

    const groups = await prisma.errorGroup.findMany({
      where: { projectId, resolvedAt: showResolved ? { not: null } : null },
      orderBy: { lastSeenAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      groups: groups.map((g) => ({
        id: g.id,
        title: g.title,
        level: g.level,
        environment: g.environment,
        count: g.count,
        firstSeenAt: g.firstSeenAt,
        lastSeenAt: g.lastSeenAt,
        resolvedAt: g.resolvedAt,
        muted: g.muted,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
