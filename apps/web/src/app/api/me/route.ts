import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IMPERSONATOR_COOKIE_NAME } from "@/lib/session-cookie";
import { writeAuditLog } from "@/lib/audit";

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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (name === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  if (name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: "Name must be between 1 and 100 characters." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  await writeAuditLog({ actorId: session.user.id, action: "user.profile.updated", targetType: "User", targetId: session.user.id });

  return NextResponse.json({ ok: true, name });
}
