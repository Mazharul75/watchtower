import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgRole, UnauthorizedError, ForbiddenError } from "@/lib/rbac";
import { postToSlack } from "@/lib/slack";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireOrgRole(id, "OWNER");

    const org = await prisma.organization.findUniqueOrThrow({ where: { id }, select: { name: true, slackWebhookUrl: true } });
    if (!org.slackWebhookUrl) {
      return NextResponse.json({ error: "No Slack webhook URL is set for this organization yet." }, { status: 400 });
    }

    const result = await postToSlack(org.slackWebhookUrl, `Watchtower is connected to *${org.name}*. You'll see fix-proposal alerts here.`);
    if (!result.ok) {
      return NextResponse.json({ error: `Slack rejected the test message: ${result.error}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }
}
