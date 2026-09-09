import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { answerQuestion } from "@/lib/chatbot";

/**
 * The chatbot's public endpoint — called from the embedded widget on
 * whatever site it's installed on, so (like /api/ingest/errors) it
 * authenticates via the chatbot's public key rather than a session
 * cookie, and needs real CORS headers for a genuinely cross-origin caller.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request, context: { params: Promise<{ chatbotId: string }> }) {
  const { chatbotId } = await context.params;
  const body = await request.json().catch(() => null);

  const key = typeof body?.key === "string" ? body.key : "";
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 1000) : "";

  if (!key || !question) {
    return NextResponse.json({ error: "key and question are required" }, { status: 400, headers: CORS_HEADERS });
  }

  const rate = checkRateLimit(`chat:${key}`, 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: CORS_HEADERS });
  }

  const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!chatbot || chatbot.publicKey !== key) {
    return NextResponse.json({ error: "Unknown chatbot or key" }, { status: 404, headers: CORS_HEADERS });
  }

  const result = await answerQuestion(chatbotId, question);
  return NextResponse.json(result, { headers: CORS_HEADERS });
}
