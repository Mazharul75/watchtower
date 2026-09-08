import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ReposPanel } from "@/components/dashboard/repos-panel";

export const metadata: Metadata = { title: "Organization" };

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

  const flag = await prisma.featureFlag.findUnique({ where: { key: "phase2.github_ingestion" } });
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{membership.organization.name}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">/{membership.organization.slug}</p>
      </div>

      {github_error && <Alert tone="danger">{github_error}</Alert>}

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
    </div>
  );
}
