import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function POST(request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const group = await prisma.errorGroup.findUnique({ where: { id: groupId }, include: { project: true } });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await requireOrgRole(group.project.organizationId, "MEMBER");

    const body = await request.json().catch(() => ({}));
    const resolve = body?.resolve !== false; // default true — this route also handles un-resolving via {resolve:false}

    const updated = await prisma.errorGroup.update({
      where: { id: groupId },
      data: { resolvedAt: resolve ? new Date() : null },
    });

    return NextResponse.json({ ok: true, resolvedAt: updated.resolvedAt });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
