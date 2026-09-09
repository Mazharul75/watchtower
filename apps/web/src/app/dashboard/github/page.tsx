import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "GitHub engineering memory" };

export default async function GitHubTopLevelPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/github");

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 1) {
    redirect(`/dashboard/orgs/${memberships[0]!.organizationId}`);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">GitHub engineering memory</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Choose which organization to open.</p>
      </div>
      <Card className="p-6">
        <CardHeader title="Organizations" />
        {memberships.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-[var(--color-foreground-muted)]">You need an organization first.</p>
            <ButtonLink href="/dashboard" size="sm">
              Go create one
            </ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {memberships.map((m) => (
              <li key={m.organizationId} className="py-3">
                <Link href={`/dashboard/orgs/${m.organizationId}`} className="text-[var(--color-link)] hover:underline">
                  {m.organization.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
