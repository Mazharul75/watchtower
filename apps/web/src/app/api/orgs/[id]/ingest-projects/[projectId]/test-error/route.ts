import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { fingerprintFor, titleFor } from "@/lib/error-tracking";

/**
 * Lets an org admin see the pipeline actually work from inside the
 * dashboard, without first wiring the snippet into a real external site —
 * goes through the identical group-upsert logic /api/ingest/errors uses,
 * just triggered from an authenticated session instead of a public key.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string; projectId: string }> }) {
  try {
    const { id: organizationId, projectId } = await context.params;
    await requireOrgRole(organizationId, "ADMIN");

    const project = await prisma.ingestProject.findUnique({ where: { id: projectId } });
    if (!project || project.organizationId !== organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const message = `Test error from Watchtower — sent at ${new Date().toLocaleTimeString()}`;
    const level = "ERROR" as const;
    const fingerprint = fingerprintFor(level, message);
    const title = titleFor(message);

    const group = await prisma.errorGroup.upsert({
      where: { projectId_fingerprint: { projectId, fingerprint } },
      create: { projectId, fingerprint, title, level, environment: "test" },
      update: { count: { increment: 1 }, lastSeenAt: new Date(), resolvedAt: null },
    });

    await prisma.errorEvent.create({
      data: {
        groupId: group.id,
        message,
        stackTrace: "at sendTestError (dashboard)\nat onClick (ingest-projects-panel.tsx)",
        url: null,
      },
    });

    return NextResponse.json({ ok: true, groupId: group.id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
