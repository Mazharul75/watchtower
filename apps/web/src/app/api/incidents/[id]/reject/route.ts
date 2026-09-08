import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { rejectFixProposal } from "@/lib/fix-proposal";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: incidentId } = await context.params;
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { repository: true, fixProposal: true },
    });
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    if (!incident.fixProposal) return NextResponse.json({ error: "This incident has no fix proposal to reject." }, { status: 400 });

    const { user } = await requireOrgRole(incident.repository.organizationId, "ADMIN");

    const body = await request.json().catch(() => ({}));
    await rejectFixProposal(incident.fixProposal.id, user.id, typeof body?.note === "string" ? body.note : undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}
