import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorGroupsPanel } from "@/components/dashboard/error-groups-panel";

export const metadata: Metadata = { title: "Error tracking project" };

export default async function ErrorProjectPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, projectId } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
  });
  if (!membership) notFound();

  const project = await prisma.ingestProject.findUnique({ where: { id: projectId } });
  if (!project || project.organizationId !== id) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Errors reported by this project.</p>
      </div>

      <Card className="p-6">
        <CardHeader title="Errors" />
        <ErrorGroupsPanel organizationId={id} projectId={projectId} />
      </Card>
    </div>
  );
}
