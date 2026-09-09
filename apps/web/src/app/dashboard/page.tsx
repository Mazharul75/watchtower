import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/alert";
import { CreateOrgForm } from "@/components/dashboard/create-org-form";
import { AnimatedNumber } from "@/components/ui/animated-number";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Belt-and-braces: don't rely solely on the parent layout to enforce auth —
  // Next.js's own App Router guidance is that a page can still render even
  // when a shared layout redirects, so every protected page re-checks here.
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  const orgIds = memberships.map((m) => m.organizationId);
  const [repoCount, incidentCounts, unreadNotifications, attentionNeeded] = await Promise.all([
    prisma.repository.count({ where: { organizationId: { in: orgIds } } }),
    prisma.incident.groupBy({
      by: ["status"],
      where: { repository: { organizationId: { in: orgIds } } },
      _count: true,
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
    prisma.incident.findMany({
      where: { status: "AWAITING_APPROVAL", repository: { organizationId: { in: orgIds } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        repository: { select: { fullName: true } },
        triggerNode: { select: { type: true, externalId: true, title: true } },
      },
    }),
  ]);

  const needsAttention = incidentCounts
    .filter((c) => c.status === "AWAITING_APPROVAL")
    .reduce((sum, c) => sum + c._count, 0);

  const stats: { label: string; value: number; tone?: "warning" | "info" }[] = [
    { label: "Organizations", value: memberships.length },
    { label: "Repositories", value: repoCount },
    { label: "Awaiting your approval", value: needsAttention, tone: needsAttention > 0 ? "warning" : undefined },
    { label: "Unread notifications", value: unreadNotifications, tone: unreadNotifications > 0 ? "info" : undefined },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Everything across your organizations, in one place.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className={`text-2xl font-semibold tabular-nums ${s.tone === "warning" ? "text-[var(--color-warning-text)]" : "text-[var(--color-foreground)]"}`}>
              <AnimatedNumber value={s.value} />
            </p>
            <p className="mt-1 text-xs text-[var(--color-foreground-subtle)]">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <CardHeader title="Organizations" description="Group your repos and teammates under an organization." />
          <CreateOrgForm />
        </div>

        {memberships.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-8 text-center text-sm text-[var(--color-foreground-muted)]">
            You&apos;re not part of any organization yet. Create one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {memberships.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <Link href={`/dashboard/orgs/${m.organization.id}`} className="hover:opacity-80">
                  <p className="font-medium text-[var(--color-foreground)]">{m.organization.name}</p>
                  <p className="text-xs text-[var(--color-foreground-subtle)]">/{m.organization.slug}</p>
                </Link>
                <Badge tone="info">{m.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <CardHeader title="Needs your attention" description="Fix proposals waiting on a human review, across every organization you're in." />
        {attentionNeeded.length === 0 ? (
          <p className="text-sm text-[var(--color-foreground-subtle)]">Nothing waiting on you right now.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {attentionNeeded.map((incident) => (
              <li key={incident.id} className="flex items-center justify-between gap-3 py-3">
                <Link href={`/dashboard/incidents/${incident.id}`} className="min-w-0 hover:opacity-80">
                  <p className="truncate font-medium text-[var(--color-foreground)]">
                    {incident.repository.fullName} · {incident.triggerNode.type} #{incident.triggerNode.externalId}
                  </p>
                  <p className="truncate text-xs text-[var(--color-foreground-subtle)]">{incident.triggerNode.title ?? "(untitled)"}</p>
                </Link>
                <Badge tone="warning">awaiting approval</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
