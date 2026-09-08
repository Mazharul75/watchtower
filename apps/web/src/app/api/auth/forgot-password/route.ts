import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateRawToken, hashToken, expiryFromNow, PASSWORD_RESET_TTL_MS } from "@/lib/tokens";
import { sendEmail, passwordResetEmailTemplate } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";

const GENERIC_MESSAGE = "If an account with that email exists, a password reset link is on its way.";

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  const rl = checkRateLimit(`forgot-password:${ip}`, RATE_LIMITS.forgotPassword.limit, RATE_LIMITS.forgotPassword.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Still return the generic success shape — never reveal whether the
    // input even looked like a real account (email-enumeration protection).
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.passwordHash) {
    // Invalidate any previously issued, still-unused reset tokens for this user.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateRawToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expires: expiryFromNow(PASSWORD_RESET_TTL_MS) },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const link = `${appUrl}/reset-password?token=${rawToken}`;
    const template = passwordResetEmailTemplate(link);
    await sendEmail({ to: email, subject: "Reset your Watchtower password", html: template.html, text: template.text });

    await writeAuditLog({ actorId: user.id, action: "user.password_reset_requested", targetType: "User", targetId: user.id, ipAddress: ip });
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
