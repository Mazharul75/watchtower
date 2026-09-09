import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    await requireOrgRole(organizationId, "VIEWER");

    const chatbots = await prisma.chatbot.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { documents: true, messages: true } } },
    });

    return NextResponse.json({
      chatbots: chatbots.map((c) => ({
        id: c.id,
        name: c.name,
        publicKey: c.publicKey,
        createdAt: c.createdAt,
        documentCount: c._count.documents,
        messageCount: c._count.messages,
      })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: organizationId } = await context.params;
    const { user } = await requireOrgRole(organizationId, "ADMIN");

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) {
      return NextResponse.json({ error: "A name is required, e.g. \"support bot\" or \"docs assistant\"." }, { status: 400 });
    }

    const chatbot = await prisma.chatbot.create({ data: { organizationId, name } });

    await writeAuditLog({
      actorId: user.id,
      action: "chatbot.created",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { chatbotId: chatbot.id, name },
    });

    return NextResponse.json({ id: chatbot.id, name: chatbot.name, publicKey: chatbot.publicKey }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
