import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ organizations: [], repositories: [], incidents: [] });
    }

    const memberships = await prisma.organizationMember.findMany({ where: { userId: user.id }, select: { organizationId: true } });
    const orgIds = memberships.map((m) => m.organizationId);
    if (orgIds.length === 0) {
      return NextResponse.json({ organizations: [], repositories: [], incidents: [] });
    }

    const [organizations, repositories, incidents] = await Promise.all([
      prisma.organization.findMany({
        where: { id: { in: orgIds }, name: { contains: q, mode: "insensitive" } },
        take: 5,
        select: { id: true, name: true, slug: true },
      }),
      prisma.repository.findMany({
        where: { organizationId: { in: orgIds }, fullName: { contains: q, mode: "insensitive" } },
        take: 5,
        select: { id: true, fullName: true },
      }),
      prisma.incident.findMany({
        where: {
          repository: { organizationId: { in: orgIds } },
          OR: [{ hypothesis: { contains: q, mode: "insensitive" } }, { triggerNode: { title: { contains: q, mode: "insensitive" } } }],
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { repository: { select: { fullName: true } }, triggerNode: { select: { title: true, type: true, externalId: true } } },
      }),
    ]);

    return NextResponse.json({
      organizations: organizations.map((o) => ({ id: o.id, label: o.name, sublabel: `/${o.slug}`, href: `/dashboard/orgs/${o.id}` })),
      repositories: repositories.map((r) => ({ id: r.id, label: r.fullName, sublabel: "Repository", href: `/dashboard/repos/${r.id}` })),
      incidents: incidents.map((i) => ({
        id: i.id,
        label: i.triggerNode.title ?? `${i.triggerNode.type} #${i.triggerNode.externalId}`,
        sublabel: i.repository.fullName,
        href: `/dashboard/incidents/${i.id}`,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
