import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export async function GET(_request: Request, context: { params: Promise<{ chatbotId: string }> }) {
  try {
    const { chatbotId } = await context.params;
    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await requireOrgRole(chatbot.organizationId, "VIEWER");

    const messages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, question: true, answer: true, citedDocumentIds: true, createdAt: true },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
