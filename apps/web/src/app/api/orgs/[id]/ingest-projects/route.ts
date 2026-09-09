import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    await requireOrgRole(organizationId, "VIEWER");

    const projects = await prisma.ingestProject.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { errorGroups: true } },
        errorGroups: { where: { resolvedAt: null }, select: { id: true }, take: 1000 },
      },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        publicKey: p.publicKey,
        createdAt: p.createdAt,
        totalGroups: p._count.errorGroups,
        unresolvedGroups: p.errorGroups.length,
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
    const { id: organizationId } = await context.params;
    const { user } = await requireOrgRole(organizationId, "ADMIN");

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "A project name is required, e.g. \"marketing site\" or \"mobile app\"." }, { status: 400 });
    }

    const project = await prisma.ingestProject.create({ data: { organizationId, name } });

    await writeAuditLog({
      actorId: user.id,
      action: "ingest_project.created",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { ingestProjectId: project.id, name },
    });

    return NextResponse.json({ id: project.id, name: project.name, publicKey: project.publicKey }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
