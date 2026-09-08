import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import { generateRawToken, hashToken, expiryFromNow, EMAIL_VERIFICATION_TTL_MS } from "@/lib/tokens";
import { sendEmail, verificationEmailTemplate } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, username, email, password } = parsed.data;

  const strength = validatePasswordStrength(password);
  if (!strength.ok) {
    return NextResponse.json({ error: strength.message }, { status: 400 });
  }

  // Deliberately generic response for both "email taken" and "username taken"
  // paths below is NOT applied here because these are pre-auth uniqueness
  // constraints a legitimate user needs to resolve (choose another handle) —
  // unlike login/forgot-password, this isn't an enumeration risk in the same
  // way since registration inherently confirms uniqueness by definition.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json({ error: `That ${field} is already in use.` }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, username, email, passwordHash },
  });

  const rawToken = generateRawToken();
  await prisma.verificationToken.create({
    data: { identifier: email, token: hashToken(rawToken), expires: expiryFromNow(EMAIL_VERIFICATION_TTL_MS) },
  });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${appUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const template = verificationEmailTemplate(link);
  await sendEmail({ to: email, subject: "Verify your Watchtower email", html: template.html, text: template.text });

  await writeAuditLog({ actorId: user.id, action: "user.registered", targetType: "User", targetId: user.id, ipAddress: ip });

  return NextResponse.json({ ok: true, message: "Check your email to verify your account." }, { status: 201 });
}
