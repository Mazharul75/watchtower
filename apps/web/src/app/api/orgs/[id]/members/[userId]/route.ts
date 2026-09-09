import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import type { OrgRole } from "@prisma/client";

const ASSIGNABLE_ROLES: OrgRole[] = ["ADMIN", "MEMBER", "VIEWER"];

async function countOwners(organizationId: string): Promise<number> {
  return prisma.organizationMember.count({ where: { organizationId, role: "OWNER" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id: organizationId, userId: targetUserId } = await context.params;
    // Only an OWNER changes roles — an ADMIN could otherwise promote
    // themselves or a friend to ADMIN/OWNER-adjacent power.
    const { user: actor } = await requireOrgRole(organizationId, "OWNER");

    const body = await request.json().catch(() => null);
    const role = body?.role as OrgRole | undefined;
    if (!role || !ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role must be one of ADMIN, MEMBER, or VIEWER." }, { status: 400 });
    }

    const target = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (target.role === "OWNER" && (await countOwners(organizationId)) <= 1) {
      return NextResponse.json({ error: "Can't change the only owner's role — transfer ownership to someone else first." }, { status: 400 });
    }

    await prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
      data: { role },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "org.member.role_changed",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { targetUserId, fromRole: target.role, toRole: role },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const { id: organizationId, userId: targetUserId } = await context.params;
    const { user: actor, membership } = await requireOrgRole(organizationId, "ADMIN");

    const target = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // An ADMIN may remove MEMBER/VIEWER, but not another ADMIN or an OWNER —
    // only an OWNER can do that. Prevents an ADMIN from clearing out peers.
    if (target.role === "ADMIN" && membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only an owner can remove an admin." }, { status: 403 });
    }
    if (target.role === "OWNER") {
      if (membership.role !== "OWNER") {
        return NextResponse.json({ error: "Only an owner can remove another owner." }, { status: 403 });
      }
      if ((await countOwners(organizationId)) <= 1) {
        return NextResponse.json({ error: "Can't remove the only owner. Transfer ownership first." }, { status: 400 });
      }
    }

    await prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId, userId: targetUserId } },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "org.member.removed",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { targetUserId, role: target.role },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
