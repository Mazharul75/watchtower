import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; chatbotId: string }> }) {
  try {
    const { id: organizationId, chatbotId } = await context.params;
    const { user } = await requireOrgRole(organizationId, "ADMIN");

    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot || chatbot.organizationId !== organizationId) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    await prisma.chatbot.delete({ where: { id: chatbotId } });

    await writeAuditLog({
      actorId: user.id,
      action: "chatbot.deleted",
      targetType: "Organization",
      targetId: organizationId,
      metadata: { chatbotId, name: chatbot.name },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
