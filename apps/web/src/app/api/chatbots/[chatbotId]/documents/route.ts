import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { embedText, EMBEDDING_MODEL_ID } from "@/lib/embeddings";
import { writeAuditLog } from "@/lib/audit";

async function loadChatbotForOrgCheck(chatbotId: string) {
  return prisma.chatbot.findUnique({ where: { id: chatbotId } });
}

export async function GET(_request: Request, context: { params: Promise<{ chatbotId: string }> }) {
  try {
    const { chatbotId } = await context.params;
    const chatbot = await loadChatbotForOrgCheck(chatbotId);
    if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await requireOrgRole(chatbot.organizationId, "VIEWER");

    const documents = await prisma.chatDocument.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, createdAt: true },
    });

    return NextResponse.json({ documents });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}

export async function POST(request: Request, context: { params: Promise<{ chatbotId: string }> }) {
  try {
    const { chatbotId } = await context.params;
    const chatbot = await loadChatbotForOrgCheck(chatbotId);
    if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { user } = await requireOrgRole(chatbot.organizationId, "ADMIN");

    const body = await request.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
    const content = typeof body?.content === "string" ? body.content.trim().slice(0, 10_000) : "";
    if (!title || !content) {
      return NextResponse.json({ error: "Both a title and content are required." }, { status: 400 });
    }

    // See lib/embeddings.ts / docs/ADR-003 — the same deterministic
    // feature-hashed embedder used for the GitHub graph, not a real ML
    // model, but honest and consistent about what it is.
    const embedding = embedText(`${title}\n${content}`);

    const doc = await prisma.chatDocument.create({
      data: { chatbotId, title, content, embedding },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "chatbot_document.created",
      targetType: "Organization",
      targetId: chatbot.organizationId,
      metadata: { chatbotId, documentId: doc.id, title, embeddingModel: EMBEDDING_MODEL_ID },
    });

    return NextResponse.json({ id: doc.id, title: doc.title }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
