import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const result = await prisma.apiKey.updateMany({
      where: { id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Key not found or already revoked." }, { status: 404 });
    }

    await writeAuditLog({
      actorId: user.id,
      action: "api_key.revoked",
      targetType: "User",
      targetId: user.id,
      metadata: { apiKeyId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
