import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { IngestProjectsPanel } from "@/components/dashboard/ingest-projects-panel";

export const metadata: Metadata = { title: "Error tracking" };

export default async function ErrorTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
    include: { organization: true },
  });
  if (!membership) notFound();

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";
  const h = await headers();
  const origin = process.env.NEXTAUTH_URL ?? `https://${h.get("host")}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Error tracking</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">
          A standalone product, not a GitHub feature — monitor runtime errors from any app, whether or not it&apos;s connected to
          GitHub here.
        </p>
      </div>

      <Card className="p-6">
        <CardHeader title="Projects" description="Each project gets its own key and snippet — one per app you want to monitor." />
        <IngestProjectsPanel organizationId={id} canManage={canManage} origin={origin} />
      </Card>
    </div>
  );
}
