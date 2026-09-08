import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isSuperAdmin: true } });
  if (!dbUser?.isSuperAdmin) redirect("/dashboard");

  return <>{children}</>;
}
