import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ErrorGroupDetail } from "@/components/dashboard/error-group-detail";

export const metadata: Metadata = { title: "Error" };

export default async function ErrorGroupPage({ params }: { params: Promise<{ id: string; projectId: string; groupId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, groupId } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
  });
  if (!membership) notFound();

  const canResolve = membership.role === "OWNER" || membership.role === "ADMIN" || membership.role === "MEMBER";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <Card className="p-6">
        <ErrorGroupDetail groupId={groupId} canResolve={canResolve} />
      </Card>
    </div>
  );
}
