import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST() {
  try {
    const user = await requireUser();
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    const result = await prisma.session.deleteMany({
      where: { userId: user.id, sessionToken: { not: currentToken } },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "user.sessions_revoked_all",
      targetType: "User",
      targetId: user.id,
      metadata: { count: result.count },
    });

    return NextResponse.json({ ok: true, revoked: result.count });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
