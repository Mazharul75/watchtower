import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

export async function GET() {
  try {
    await requireSuperAdmin();
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json({ flags });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

const patchSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const flag = await prisma.featureFlag.upsert({
      where: { key: parsed.data.key },
      create: { key: parsed.data.key, enabled: parsed.data.enabled },
      update: { enabled: parsed.data.enabled },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "admin.feature_flag.toggle",
      targetType: "FeatureFlag",
      targetId: flag.key,
      metadata: { enabled: flag.enabled },
    });

    return NextResponse.json({ flag });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
