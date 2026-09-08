import type { Metadata } from "next";
import Link from "next/link";
import { LogoWordmark } from "@watchtower/ui";
import { signOutAction } from "@/app/actions/auth-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = { title: "Admin console" };

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-6">
        <Link href="/"><LogoWordmark size={16} /></Link>
        <div className="flex items-center gap-3">
          <ButtonLink href="/dashboard" variant="ghost" size="sm">Back to dashboard</ButtonLink>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" size="sm">Sign out</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6 md:p-10">
        <h1 className="text-2xl font-semibold">Platform admin console</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">
          Every action here — impersonation, feature-flag changes — is written to the audit log.
        </p>
        <Card className="mt-8 p-6">
          <AdminConsole />
        </Card>
      </main>
    </div>
  );
}
