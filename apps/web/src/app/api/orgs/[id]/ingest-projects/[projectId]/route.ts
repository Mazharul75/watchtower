import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; projectId: string }> }) {
  try {
    const { id: organizationId, projectId } = await context.params;
    const { user } = await requireOrgRole(organizationId, "ADMIN");

    const project = await prisma.ingestProject.findUnique({ where: { id: projectId } });
    if (!project || project.organizationId !== organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Cascades to every ErrorGroup and ErrorEvent under this project.
    await prisma.ingestProject.delete({ where: { id: projectId } });

    await writeAuditLog({
      actorId: user.id,
      action: "ingest_project.deleted",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { ingestProjectId: projectId, name: project.name },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
