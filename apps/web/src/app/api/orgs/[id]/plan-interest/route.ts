import { NextResponse } from "next/server";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

/**
 * Real interest-signal capture for the eventual paid tier — not a fake
 * "coming soon" button. Every click is a genuine audit-logged event an
 * admin can query later (`action: "plan.pro_interest_registered"`) to see
 * actual demand before deciding whether/how to price a paid plan.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { user } = await requireOrgRole(id, "OWNER");

    await writeAuditLog({
      actorId: user.id,
      action: "plan.pro_interest_registered",
      targetType: "Organization",
      targetId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
