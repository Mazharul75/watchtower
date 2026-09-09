import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ChatbotDetail } from "@/components/dashboard/chatbot-detail";

export const metadata: Metadata = { title: "Chatbot" };

export default async function ChatbotDetailPage({ params }: { params: Promise<{ id: string; chatbotId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, chatbotId } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
  });
  if (!membership) notFound();

  const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!chatbot || chatbot.organizationId !== id) notFound();

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{chatbot.name}</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">Manage what this bot knows, and see what people ask it.</p>
      </div>
      <Card className="p-6">
        <ChatbotDetail chatbotId={chatbotId} canManage={canManage} />
      </Card>
    </div>
  );
}
