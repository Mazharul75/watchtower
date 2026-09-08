import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const take = Math.min(Number(searchParams.get("take") ?? 50), 200);

    const logs = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
