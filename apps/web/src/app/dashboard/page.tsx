import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/alert";
import { CreateOrgForm } from "@/components/dashboard/create-org-form";

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

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">
          Your organizations live here. Repository connections and incident intelligence arrive in Phase 2 and 3.
        </p>
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
        <CardHeader title="What's next" description="Phase 1 gives you the platform. Later phases build on it." />
        <ul className="flex flex-col gap-2 text-sm text-[var(--color-foreground-muted)]">
          <li>✅ Accounts, email verification, GitHub/Google login, password reset — done.</li>
          <li>✅ Organizations with owner/admin/member/viewer roles, enforced server-side — done.</li>
          <li>✅ Phase 2: connect a GitHub repo, auto-built engineering graph, hybrid retrieval — done.</li>
          <li>⏳ Phase 3: cited root-cause analysis, incident memory, approval-gated fix PRs.</li>
        </ul>
      </Card>
    </div>
  );
}
