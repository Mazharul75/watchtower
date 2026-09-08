import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { GraphViewer } from "@/components/dashboard/graph-viewer";
import { IncidentsPanel } from "@/components/dashboard/incidents-panel";

export const metadata: Metadata = { title: "Engineering graph" };

export default async function RepoGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const repo = await prisma.repository.findUnique({ where: { id } });
  if (!repo) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: repo.organizationId, userId: session.user.id } },
  });
  if (!membership) notFound();

  const canInvestigate = membership.role === "OWNER" || membership.role === "ADMIN" || membership.role === "MEMBER";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{repo.fullName}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">
          {repo.lastIngestedAt
            ? `Engineering graph, last updated ${new Date(repo.lastIngestedAt).toLocaleString()}`
            : "No events ingested yet — this fills in as GitHub sends webhooks for this repo's issues, PRs, and checks."}
        </p>
      </div>

      <Card className="p-6">
        <CardHeader
          title="Incidents"
          description="Root-cause investigations — auto-triggered on CI failure, or start one manually below."
        />
        <IncidentsPanel repositoryId={id} />
      </Card>

      <Card className="p-6">
        <CardHeader
          title="Nodes and relationships"
          description="Auto-built from real issues, pull requests, and check runs — no manual entry."
        />
        <GraphViewer repositoryId={id} canInvestigate={canInvestigate} />
      </Card>
    </div>
  );
}
