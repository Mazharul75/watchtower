import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";
import { SESSION_COOKIE_NAME, secureCookieOptions, SESSION_MAX_AGE_SECONDS } from "@/lib/session-cookie";

/**
 * Auth.js's Credentials provider is documented to NOT support the
 * "database" session strategy: `signIn("credentials", ...)` validates the
 * user but the adapter never persists a Session row for it, because
 * Auth.js assumes credentials logins have no backing OAuth Account to
 * attach a database session to (https://errors.authjs.dev — session
 * strategy must be "jwt" when using Credentials).
 *
 * This is a genuine incompatibility with the roadmap's explicit requirement
 * for revocable, DB-backed sessions across EVERY auth method — including
 * email/password — not just OAuth. Rather than fall back to JWT sessions
 * everywhere (and lose server-side revocation for all users), this module
 * performs credentials verification and Session-row creation ourselves,
 * using the exact same table/cookie shape Auth.js's Prisma adapter uses.
 * `auth()` can't tell the difference — it just reads the Session table.
 * GitHub/Google continue to go through Auth.js's own adapter flow unchanged.
 */

export type CredentialsLoginResult = { ok: true } | { ok: false; error: "INVALID" | "EMAIL_NOT_VERIFIED" | "RATE_LIMITED" | "SUSPENDED" };

export async function performCredentialsLogin(email: string, password: string): Promise<CredentialsLoginResult> {
  const h = await headers();
  const ip = clientIpFrom(h);

  const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (!rl.allowed) {
    return { ok: false, error: "RATE_LIMITED" };
  }

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { ok: false, error: "INVALID" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.passwordHash) {
    return { ok: false, error: "INVALID" };
  }
  if (!user.emailVerified) {
    return { ok: false, error: "EMAIL_NOT_VERIFIED" };
  }
  if (user.suspendedAt) {
    return { ok: false, error: "SUSPENDED" };
  }

  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    return { ok: false, error: "INVALID" };
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
      ipAddress: ip,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, { ...secureCookieOptions, expires });

  await writeAuditLog({
    actorId: user.id,
    action: "user.login",
    targetType: "User",
    targetId: user.id,
    metadata: { provider: "credentials" },
    ipAddress: ip,
  });

  return { ok: true };
}
