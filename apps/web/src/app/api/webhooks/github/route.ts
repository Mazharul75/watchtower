import { NextResponse } from "next/server";
import { verify } from "@octokit/webhooks-methods";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processWebhookEvent } from "@/lib/ingestion";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5MB — generous for a webhook, but not unbounded

/**
 * GitHub retries any delivery that doesn't get a 2xx back, so this handler:
 *   - verifies the signature before touching anything else,
 *   - rejects fast on an oversized body,
 *   - dedupes by X-GitHub-Delivery so a retry never double-ingests,
 *   - always stores the raw event (even ones we don't act on) for audit/replay,
 *   - never lets a downstream ingestion bug turn into a 5xx that triggers
 *     endless GitHub retries — errors are recorded on the row instead.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const deliveryId = request.headers.get("x-github-delivery");
  const eventType = request.headers.get("x-github-event");

  if (!signature || !deliveryId || !eventType) {
    return NextResponse.json({ error: "Missing required GitHub webhook headers." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const flag = await prisma.featureFlag.findUnique({ where: { key: "phase2.github_ingestion" } });
  if (!flag?.enabled) {
    // 503, not 4xx: this tells GitHub to retry later rather than giving up,
    // since an admin flipping the flag back on is exactly the case where a
    // retried delivery should succeed.
    return NextResponse.json({ error: "Ingestion is currently disabled." }, { status: 503 });
  }

  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Fails loudly rather than silently accepting unverifiable webhooks.
    return NextResponse.json({ error: "Webhook receiver is not configured." }, { status: 503 });
  }

  const isValid = await verify(webhookSecret, rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  // Idempotent: GitHub's own retries reuse the same delivery id.
  const existing = await prisma.webhookEvent.findUnique({ where: { deliveryId } });
  if (existing) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const githubRepoId = (payload.repository as { id?: number } | undefined)?.id;
  const repository = githubRepoId
    ? await prisma.repository.findUnique({ where: { githubRepoId: String(githubRepoId) } })
    : null;

  const action = typeof payload.action === "string" ? payload.action : null;

  const event = await prisma.webhookEvent.create({
    data: {
      deliveryId,
      eventType,
      action,
      payload: payload as Prisma.InputJsonValue,
      repositoryId: repository?.id,
    },
  });

  // Processed inline rather than queued — acceptable at Phase 2's expected
  // volume (one repo's worth of issue/PR traffic); a real job queue is the
  // documented next step once ingestion volume justifies one.
  await processWebhookEvent(event.id);

  return NextResponse.json({ ok: true });
}
