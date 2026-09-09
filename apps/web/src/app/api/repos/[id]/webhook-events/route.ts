import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: repositoryId } = await context.params;
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

    await requireOrgRole(repo.organizationId, "VIEWER");

    const events = await prisma.webhookEvent.findMany({
      where: { repositoryId },
      orderBy: { receivedAt: "desc" },
      take: 25,
      select: { id: true, eventType: true, action: true, processedAt: true, error: true, receivedAt: true },
    });

    return NextResponse.json({ events });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
