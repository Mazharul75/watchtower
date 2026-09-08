import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE_NAME, IMPERSONATOR_COOKIE_NAME, secureCookieOptions } from "@/lib/session-cookie";
import { clientIpFrom } from "@/lib/rate-limit";

const IMPERSONATION_SESSION_MS = 60 * 60 * 1000; // 1 hour, deliberately short

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();

    const body = await request.json().catch(() => null);
    const targetUserId = body?.userId as string | undefined;
    if (!targetUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (targetUserId === admin.id) {
      return NextResponse.json({ error: "You cannot impersonate yourself." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const currentSessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!currentSessionToken) {
      return NextResponse.json({ error: "No active admin session to preserve." }, { status: 401 });
    }

    const impersonationToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + IMPERSONATION_SESSION_MS);
    await prisma.session.create({
      data: { sessionToken: impersonationToken, userId: target.id, expires },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "admin.impersonate.start",
      targetType: "User",
      targetId: target.id,
      metadata: { targetEmail: target.email },
      ipAddress: clientIpFrom(request.headers),
    });

    const res = NextResponse.json({
      ok: true,
      impersonating: { id: target.id, name: target.name, email: target.email },
    });
    res.cookies.set(IMPERSONATOR_COOKIE_NAME, currentSessionToken, { ...secureCookieOptions, maxAge: IMPERSONATION_SESSION_MS / 1000 });
    res.cookies.set(SESSION_COOKIE_NAME, impersonationToken, { ...secureCookieOptions, expires });
    return res;
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
