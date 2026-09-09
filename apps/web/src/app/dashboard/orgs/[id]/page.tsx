import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge } from "@/components/ui/alert";
import { ReposPanel } from "@/components/dashboard/repos-panel";
import { MembersPanel } from "@/components/dashboard/members-panel";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { IncidentTrendChart } from "@/components/dashboard/incident-trend-chart";

export const metadata: Metadata = { title: "Organization" };

const INCIDENT_STATUS_TONE: Record<string, "info" | "warning" | "success" | "danger"> = {
  INVESTIGATING: "info",
  ABSTAINED: "warning",
  AWAITING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ github_error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { github_error } = await searchParams;

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
    include: { organization: true },
  });

  if (!membership) notFound();

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [flag, repoCount, memberCount, repos, incidentCounts, recentIncidents, recentIncidentDates] = await Promise.all([
    prisma.featureFlag.findUnique({ where: { key: "phase2.github_ingestion" } }),
    prisma.repository.count({ where: { organizationId: id } }),
    prisma.organizationMember.count({ where: { organizationId: id } }),
    prisma.repository.findMany({ where: { organizationId: id }, select: { id: true } }),
    prisma.incident.groupBy({
      by: ["status"],
      where: { repository: { organizationId: id } },
      _count: true,
    }),
    prisma.incident.findMany({
      where: { repository: { organizationId: id } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        repository: { select: { fullName: true } },
        triggerNode: { select: { type: true, externalId: true, title: true } },
      },
    }),
    prisma.incident.findMany({
      where: { repository: { organizationId: id }, createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const repoIds = repos.map((r) => r.id);
  const auditLog = canManage
    ? await prisma.auditLog.findMany({
        where: {
          OR: [
            { targetType: "Organization", targetId: id },
            ...(repoIds.length > 0 ? [{ targetType: "Repository", targetId: { in: repoIds } }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { actor: { select: { name: true, email: true } } },
      })
    : [];

  const openIncidents = incidentCounts
    .filter((c) => c.status === "INVESTIGATING" || c.status === "AWAITING_APPROVAL")
    .reduce((sum, c) => sum + c._count, 0);
  const resolvedIncidents = incidentCounts
    .filter((c) => c.status === "APPROVED" || c.status === "REJECTED")
    .reduce((sum, c) => sum + c._count, 0);
  const totalIncidents = incidentCounts.reduce((sum, c) => sum + c._count, 0);

  const stats = [
    { label: "Repositories", value: repoCount },
    { label: "Members", value: memberCount },
    { label: "Open incidents", value: openIncidents },
    { label: "Resolved incidents", value: resolvedIncidents },
  ];

  // Bucket real incident timestamps into a 14-day series, oldest first —
  // an all-zero fortnight still renders as a flat, honest baseline rather
  // than hiding the chart, since "no incidents" is itself real information.
  const trendDays = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - i));
    const count = recentIncidentDates.filter((inc) => {
      const d = new Date(inc.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === date.getTime();
    }).length;
    return { label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count };
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{membership.organization.name}</h1>
          <p className="mt-1 text-[var(--color-foreground-muted)]">/{membership.organization.slug}</p>
        </div>
        <Link
          href={`/dashboard/orgs/${id}/settings`}
          className="shrink-0 rounded-lg border border-[var(--color-border-strong)] px-3 py-2 text-sm text-[var(--color-foreground-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--color-foreground)]"
        >
          Settings
        </Link>
      </div>

      {github_error && <Alert tone="danger">{github_error}</Alert>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-2xl font-semibold tabular-nums text-[var(--color-foreground)]">
              <AnimatedNumber value={s.value} />
            </p>
            <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <CardHeader title="Incident activity" description="Investigations started per day, last 14 days." />
        <IncidentTrendChart days={trendDays} />
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Connected repositories"
          description="Watchtower auto-builds an engineering graph from each repo's real issues, PRs, and CI history."
        />
        {!flag?.enabled ? (
          <Alert tone="info">
            {canManage
              ? "GitHub repository connections aren't turned on for this instance yet — enable the phase2.github_ingestion feature flag in the admin console."
              : "GitHub repository connections aren't turned on for this instance yet. Ask an org owner or admin."}
          </Alert>
        ) : (
          <ReposPanel organizationId={id} canManage={canManage} />
        )}
      </Card>

      {totalIncidents > 0 && (
        <Card className="p-6">
          <CardHeader title="Recent incidents" description="Across every repository in this organization." />
          <ul className="divide-y divide-[var(--color-border)]">
            {recentIncidents.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/dashboard/incidents/${incident.id}`} className="min-w-0 hover:opacity-80">
                  <p className="truncate font-medium text-[var(--color-foreground)]">
                    {incident.repository.fullName} · {incident.triggerNode.type} #{incident.triggerNode.externalId}
                  </p>
                  <p className="truncate text-xs text-[var(--color-foreground-subtle)]">
                    {incident.triggerNode.title ?? "(untitled)"} · {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </Link>
                <Badge tone={INCIDENT_STATUS_TONE[incident.status] ?? "info"}>{incident.status.toLowerCase().replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6">
        <CardHeader title="Members" description="Everyone with access to this organization, and their role." />
        <MembersPanel organizationId={id} currentUserRole={membership.role} />
      </Card>

      {canManage && (
        <Card className="p-6">
          <CardHeader title="Activity log" description="Recent privileged actions taken in this organization." />
          {auditLog.length === 0 ? (
            <p className="text-sm text-[var(--color-foreground-subtle)]">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {auditLog.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="text-[var(--color-foreground)]">
                    <span className="font-medium">{entry.actor?.name ?? entry.actor?.email ?? "System"}</span>{" "}
                    <span className="text-[var(--color-foreground-muted)]">{entry.action.replace(/\./g, " → ")}</span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-foreground-subtle)]">{new Date(entry.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
