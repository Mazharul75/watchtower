import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IMPERSONATOR_COOKIE_NAME } from "@/lib/session-cookie";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Authoritative check: this is a Server Component running in Node.js
  // runtime with full Prisma access, independent of middleware's cheap
  // cookie-presence redirect.
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuperAdmin: true },
  });

  const cookieStore = await cookies();
  const isImpersonating = Boolean(cookieStore.get(IMPERSONATOR_COOKIE_NAME)?.value);

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar isSuperAdmin={dbUser?.isSuperAdmin ?? false} />
      <div className="flex flex-1 flex-col">
        {isImpersonating && <ImpersonationBanner name={session.user.name ?? null} email={session.user.email ?? null} />}
        <Topbar name={session.user.name ?? null} email={session.user.email ?? null} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
