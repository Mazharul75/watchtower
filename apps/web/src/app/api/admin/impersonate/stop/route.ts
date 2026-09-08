import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { SESSION_COOKIE_NAME, IMPERSONATOR_COOKIE_NAME, secureCookieOptions } from "@/lib/session-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const impersonatorToken = cookieStore.get(IMPERSONATOR_COOKIE_NAME)?.value;
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!impersonatorToken) {
    return NextResponse.json({ error: "Not currently impersonating anyone." }, { status: 400 });
  }

  const impersonatedSession = currentToken
    ? await prisma.session.findUnique({ where: { sessionToken: currentToken } })
    : null;

  if (currentToken) {
    await prisma.session.delete({ where: { sessionToken: currentToken } }).catch(() => undefined);
  }

  const adminSession = await prisma.session.findUnique({ where: { sessionToken: impersonatorToken } });

  await writeAuditLog({
    actorId: adminSession?.userId ?? null,
    action: "admin.impersonate.stop",
    targetType: "User",
    targetId: impersonatedSession?.userId,
  });

  const res = NextResponse.json({ ok: true });
  if (adminSession) {
    res.cookies.set(SESSION_COOKIE_NAME, impersonatorToken, { ...secureCookieOptions, expires: adminSession.expires });
  } else {
    // The admin's own session expired mid-impersonation — send them to log in again rather than restoring a dead cookie.
    res.cookies.delete(SESSION_COOKIE_NAME);
  }
  res.cookies.delete(IMPERSONATOR_COOKIE_NAME);
  return res;
}
