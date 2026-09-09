import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import type { OrgRole } from "@prisma/client";

const INVITABLE_ROLES: OrgRole[] = ["ADMIN", "MEMBER", "VIEWER"];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    await requireOrgRole(organizationId, "VIEWER");

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, username: true } } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.createdAt,
        name: m.user.name,
        email: m.user.email,
        username: m.user.username,
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
    const { user: actor, membership } = await requireOrgRole(organizationId, "ADMIN");

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body?.role as OrgRole | undefined;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!role || !INVITABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role must be one of ADMIN, MEMBER, or VIEWER." }, { status: 400 });
    }
    // Only an OWNER can hand out ADMIN — an ADMIN inviting another ADMIN
    // would otherwise let two ADMINs bootstrap their way to full control.
    if (role === "ADMIN" && membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only an organization owner can invite an admin." }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return NextResponse.json(
        { error: "No Watchtower account exists with that email yet. Ask them to sign up first, then invite them." },
        { status: 404 },
      );
    }

    const existing = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: targetUser.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "That person is already a member of this organization." }, { status: 409 });
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    const created = await prisma.organizationMember.create({
      data: { organizationId, userId: targetUser.id, role },
    });

    await writeAuditLog({
      actorId: actor.id,
      action: "org.member.invited",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { invitedUserId: targetUser.id, role },
    });

    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: "org.member.invited",
        title: `You were added to ${org.name}`,
        body: `You joined as ${role.toLowerCase()}.`,
        link: `/dashboard/orgs/${organizationId}`,
      },
    });

    // Best-effort email — a failed send shouldn't undo the membership that
    // was already created; the in-app notification above is the fallback.
    try {
      await sendEmail({
        to: targetUser.email,
        subject: `You've been added to ${org.name} on Watchtower`,
        html: `<p>${actor.name ?? actor.email} added you to <strong>${org.name}</strong> as ${role.toLowerCase()}.</p>`,
        text: `${actor.name ?? actor.email} added you to ${org.name} as ${role.toLowerCase()}.`,
      });
    } catch {
      // Ignored — see comment above.
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
