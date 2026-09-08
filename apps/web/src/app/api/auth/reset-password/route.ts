import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { hashToken, isExpired } from "@/lib/tokens";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  const rl = checkRateLimit(`reset-password:${ip}`, RATE_LIMITS.resetPassword.limit, RATE_LIMITS.resetPassword.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { token, password } = parsed.data;

  const strength = validatePasswordStrength(password);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.message }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || isExpired(record.expires)) {
    return NextResponse.json({ error: "This reset link is invalid or has expired. Request a new one." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
    // Reset invalidates every existing session — if an attacker had a live
    // session, this ends it the moment the real owner regains control.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  await writeAuditLog({ actorId: record.userId, action: "user.password_reset_completed", targetType: "User", targetId: record.userId, ipAddress: ip });

  return NextResponse.json({ ok: true, message: "Password updated. You can now log in with your new password." });
}
