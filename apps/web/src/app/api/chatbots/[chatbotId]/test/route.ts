import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { answerQuestion } from "@/lib/chatbot";

/**
 * Lets a logged-in org member try the chatbot from inside the dashboard
 * itself, without needing to embed the widget on a separate site first —
 * authenticated via the session (like every other dashboard route), not
 * the public key the external widget uses. Same answerQuestion() pipeline
 * either way, so what you see here is exactly what the widget would say.
 */
export async function POST(request: Request, context: { params: Promise<{ chatbotId: string }> }) {
  try {
    const { chatbotId } = await context.params;
    const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
    if (!chatbot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await requireOrgRole(chatbot.organizationId, "VIEWER");

    const body = await request.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";
    if (!question) {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    const result = await answerQuestion(chatbotId, question);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
