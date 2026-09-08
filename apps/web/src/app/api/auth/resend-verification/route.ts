import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/validation";
import { generateRawToken, hashToken, expiryFromNow, EMAIL_VERIFICATION_TTL_MS } from "@/lib/tokens";
import { sendEmail, verificationEmailTemplate } from "@/lib/email";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";

const GENERIC_RESPONSE = NextResponse.json({
  ok: true,
  message: "If that account exists and isn't verified yet, a new verification email is on its way.",
});

export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers);
  const rl = checkRateLimit(`resend-verification:${ip}`, RATE_LIMITS.forgotPassword.limit, RATE_LIMITS.forgotPassword.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = emailSchema.safeParse(body?.email);
  if (!parsed.success) {
    // Same generic response even on bad input shape — never confirm/deny existence.
    return GENERIC_RESPONSE;
  }
  const email = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    const rawToken = generateRawToken();
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashToken(rawToken), expires: expiryFromNow(EMAIL_VERIFICATION_TTL_MS) },
    });
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const link = `${appUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(email)}`;
    const template = verificationEmailTemplate(link);
    await sendEmail({ to: email, subject: "Verify your Watchtower email", html: template.html, text: template.text });
  }

  // Identical response whether or not the account exists/was already
  // verified — this is the email-enumeration protection from the roadmap's
  // security baseline, applied consistently with forgot-password below.
  return GENERIC_RESPONSE;
}
