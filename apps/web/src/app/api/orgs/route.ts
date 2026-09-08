import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/rbac";
import { createOrgSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFrom } from "@/lib/rate-limit";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const baseSlug = slugify(parsed.data.name) || "org";
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const org = await prisma.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "org.created",
      targetType: "Organization",
      targetId: org.id,
      ipAddress: clientIpFrom(request.headers),
    });

    return NextResponse.json({ organization: { id: org.id, name: org.name, slug: org.slug, role: "OWNER" } }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
