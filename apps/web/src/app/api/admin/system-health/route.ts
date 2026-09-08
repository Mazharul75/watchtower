import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [
      totalUsers,
      suspendedUsers,
      totalOrgs,
      totalRepos,
      totalSessions,
      incidentsByStatus,
      incidentsByProvider,
      webhookStats,
      recentWebhookErrors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspendedAt: { not: null } } }),
      prisma.organization.count(),
      prisma.repository.count(),
      prisma.session.count(),
      prisma.incident.groupBy({ by: ["status"], _count: true }),
      prisma.incident.groupBy({ by: ["llmProvider"], _count: true }),
      prisma.webhookEvent.aggregate({
        _count: { _all: true },
      }),
      prisma.webhookEvent.count({ where: { error: { not: null } } }),
    ]);

    const unprocessedWebhooks = await prisma.webhookEvent.count({ where: { processedAt: null } });

    return NextResponse.json({
      users: { total: totalUsers, suspended: suspendedUsers },
      organizations: totalOrgs,
      repositories: totalRepos,
      activeSessions: totalSessions,
      incidents: {
        byStatus: incidentsByStatus.map((s) => ({ status: s.status, count: s._count })),
        byProvider: incidentsByProvider.map((p) => ({ provider: p.llmProvider ?? "(abstained, no provider)", count: p._count })),
      },
      webhooks: {
        total: webhookStats._count._all,
        errored: recentWebhookErrors,
        unprocessed: unprocessedWebhooks,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
