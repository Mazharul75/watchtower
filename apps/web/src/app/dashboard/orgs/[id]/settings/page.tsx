import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OrgSettingsPanel } from "@/components/dashboard/org-settings-panel";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrgSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
    include: { organization: true },
  });
  if (!membership) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{membership.organization.name} settings</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Rename this organization, or leave/delete it.</p>
      </div>
      <OrgSettingsPanel
        organizationId={id}
        organizationName={membership.organization.name}
        currentUserRole={membership.role}
        currentUserId={session.user.id}
      />
    </div>
  );
}
