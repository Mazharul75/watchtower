import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get("take") ?? 25), 100);

    const users = await prisma.user.findMany({
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        emailVerified: true,
        isSuperAdmin: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true,
        _count: { select: { memberships: true, sessions: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
