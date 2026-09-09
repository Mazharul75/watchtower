import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const group = await prisma.errorGroup.findUnique({
      where: { id: groupId },
      include: { project: true, events: { orderBy: { receivedAt: "desc" }, take: 20 } },
    });
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await requireOrgRole(group.project.organizationId, "VIEWER");

    return NextResponse.json({
      group: {
        id: group.id,
        title: group.title,
        level: group.level,
        environment: group.environment,
        count: group.count,
        firstSeenAt: group.firstSeenAt,
        lastSeenAt: group.lastSeenAt,
        resolvedAt: group.resolvedAt,
        project: { id: group.project.id, name: group.project.name },
        events: group.events.map((e) => ({
          id: e.id,
          message: e.message,
          stackTrace: e.stackTrace,
          url: e.url,
          userAgent: e.userAgent,
          release: e.release,
          receivedAt: e.receivedAt,
        })),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
