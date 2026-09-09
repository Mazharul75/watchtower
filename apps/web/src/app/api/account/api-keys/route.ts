import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, UnauthorizedError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireUser();
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "A name is required, e.g. \"laptop CI\" or \"scripts\"." }, { status: 400 });
    }

    // The raw key is returned exactly once — only its SHA-256 hash is ever
    // persisted. apps/api hashes an incoming `Authorization: Bearer` header
    // the same way to look this row up, so the two sides never need a
    // shared secret beyond the database itself.
    const rawKey = `wt_${randomBytes(24).toString("base64url")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const created = await prisma.apiKey.create({
      data: { name, keyHash, userId: user.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "api_key.created",
      targetType: "User",
      targetId: user.id,
      metadata: { apiKeyId: created.id, name },
    });

    return NextResponse.json({ id: created.id, name: created.name, key: rawKey, createdAt: created.createdAt }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }
}
