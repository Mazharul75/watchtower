import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IMPERSONATOR_COOKIE_NAME } from "@/lib/session-cookie";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const impersonating = Boolean(cookieStore.get(IMPERSONATOR_COOKIE_NAME)?.value);

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      username: session.user.username,
      email: session.user.email,
      image: session.user.image,
      isSuperAdmin: session.user.isSuperAdmin,
    },
    impersonating,
    organizations: memberships.map((m) => ({ id: m.organization.id, name: m.organization.name, slug: m.organization.slug, role: m.role })),
  });
}
