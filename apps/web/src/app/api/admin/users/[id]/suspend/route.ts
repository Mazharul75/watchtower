import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireSuperAdmin();
    const { id: targetUserId } = await context.params;

    if (targetUserId === admin.id) {
      return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.isSuperAdmin) {
      return NextResponse.json({ error: "Another super admin cannot be suspended from here." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 500) : null;

    await prisma.$transaction([
      prisma.user.update({ where: { id: targetUserId }, data: { suspendedAt: new Date(), suspendedReason: reason } }),
      // Suspension takes effect immediately, not just on the next login attempt.
      prisma.session.deleteMany({ where: { userId: targetUserId } }),
    ]);

    await writeAuditLog({
      actorId: admin.id,
      action: "admin.user_suspended",
      targetType: "User",
      targetId: targetUserId,
      metadata: { reason },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
