import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function DELETE(_request: Request, context: { params: Promise<{ chatbotId: string; docId: string }> }) {
  try {
    const { chatbotId, docId } = await context.params;
    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await requireOrgRole(chatbot.organizationId, "ADMIN");

    const doc = await prisma.chatDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.chatbotId !== chatbotId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.chatDocument.delete({ where: { id: docId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
