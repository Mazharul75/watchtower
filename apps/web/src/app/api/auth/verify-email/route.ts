import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailSchema } from "@/lib/validation";
import { hashToken, isExpired } from "@/lib/tokens";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification link." }, { status: 400 });
  }
  const { token, email } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record || record.identifier !== email) {
    return NextResponse.json({ error: "This verification link is invalid or has already been used." }, { status: 400 });
  }

  if (isExpired(record.expires)) {
    await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => undefined);
    return NextResponse.json({ error: "This verification link has expired. Request a new one." }, { status: 410 });
  }

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // One-time use: delete immediately after success.
  await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => undefined);

  await writeAuditLog({ actorId: user.id, action: "user.email_verified", targetType: "User", targetId: user.id });

  return NextResponse.json({ ok: true, message: "Email verified. You can now log in." });
}
