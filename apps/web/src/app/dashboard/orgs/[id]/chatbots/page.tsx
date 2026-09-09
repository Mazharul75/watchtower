import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/card";
import { ChatbotsPanel } from "@/components/dashboard/chatbots-panel";

export const metadata: Metadata = { title: "AI chatbots" };

export default async function ChatbotsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: id, userId: session.user.id } },
  });
  if (!membership) notFound();

  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";
  const h = await headers();
  const origin = process.env.NEXTAUTH_URL ?? `https://${h.get("host")}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">AI chatbots</h1>
        <p className="mt-1 text-[var(--color-foreground-muted)]">
          A standalone product — a support chatbot for any website, grounded only in documents you give it. It says
          &ldquo;I don&apos;t know&rdquo; rather than inventing an answer.
        </p>
      </div>

      <Card className="p-6">
        <CardHeader title="Your chatbots" description="Each one gets its own knowledge base and an embeddable widget." />
        <ChatbotsPanel organizationId={id} canManage={canManage} origin={origin} />
      </Card>
    </div>
  );
}
