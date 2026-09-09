import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireOrgRole(id, "OWNER");

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 64) {
      return NextResponse.json({ error: "Organization name must be between 2 and 64 characters." }, { status: 400 });
    }

    const org = await prisma.organization.update({ where: { id }, data: { name } });

    await writeAuditLog({
      actorId: user.id,
      action: "org.renamed",
      targetType: "Organization",
      targetId: id,
      metadata: { name },
    });

    return NextResponse.json({ organization: { id: org.id, name: org.name, slug: org.slug } });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireOrgRole(id, "OWNER");

    const org = await prisma.organization.findUniqueOrThrow({ where: { id } });

    // Cascades: OrganizationMember, Repository (and everything under a
    // repository — WebhookEvent, GraphNode/Edge, Embedding, Incident and
    // its evidence/history/fix proposal) are all `onDelete: Cascade` in the
    // schema, so this one delete is genuinely complete, not a partial wipe.
    await prisma.organization.delete({ where: { id } });

    // The org itself is gone, so this can't reference targetId=id the way
    // every other audit entry does — logged against the actor instead, with
    // the deleted org's identity preserved in metadata for the record.
    await writeAuditLog({
      actorId: user.id,
      action: "org.deleted",
      targetType: "User",
      targetId: user.id,
      metadata: { organizationId: id, name: org.name, slug: org.slug },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
