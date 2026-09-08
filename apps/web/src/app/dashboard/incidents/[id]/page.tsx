import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { IncidentDetail } from "@/components/dashboard/incident-detail";

export const metadata: Metadata = { title: "Incident" };

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const incident = await prisma.incident.findUnique({ where: { id }, include: { repository: true } });
  if (!incident) notFound();

  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: incident.repository.organizationId, userId: session.user.id } },
  });
  if (!membership) notFound();

  const canApprove = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Card className="p-6">
        <IncidentDetail incidentId={id} canApprove={canApprove} />
      </Card>
    </div>
  );
}
