import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/alert";
import { SessionsPanel } from "@/components/dashboard/sessions-panel";
import { ApiKeysPanel } from "@/components/dashboard/api-keys-panel";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata: Metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/settings");
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Manage your profile, sign-in methods, and active sessions.</p>
      </div>

      <Card className="p-6">
        <CardHeader title="Profile" />
        <dl className="grid grid-cols-[120px_1fr] items-center gap-y-3 text-sm">
          <dt className="text-[var(--color-foreground-subtle)]">Name</dt>
          <ProfileForm initialName={session.user.name ?? null} />
          <dt className="text-[var(--color-foreground-subtle)]">Username</dt>
          <dd>{session?.user.username ?? "—"}</dd>
          <dt className="text-[var(--color-foreground-subtle)]">Email</dt>
          <dd>{session?.user.email}</dd>
        </dl>
      </Card>

      <Card className="p-6">
        <CardHeader title="Sign-in methods" description="Accounts linked to your Watchtower profile." />
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">Email &amp; password</Badge>
          {accounts.map((a) => (
            <Badge key={a.provider} tone="success">{a.provider}</Badge>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader title="Active sessions" description="Devices currently signed in to your account." />
        <SessionsPanel />
      </Card>

      <Card className="p-6">
        <CardHeader title="API keys" description="For calling the Watchtower API from scripts, CI, or your own tools." />
        <ApiKeysPanel />
      </Card>
    </div>
  );
}
