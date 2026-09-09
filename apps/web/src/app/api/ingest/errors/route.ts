import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { normalizeLevel, fingerprintFor, titleFor } from "@/lib/error-tracking";

/**
 * The one genuinely public, unauthenticated write endpoint in the whole
 * app — by design. It's called from OTHER apps entirely (via the snippet
 * shown in the dashboard), not from a logged-in Watchtower session, so it
 * authenticates via an IngestProject's public key in the request body
 * instead of a session cookie, and needs real CORS headers since the
 * calling page's origin is never watchtower's own.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const key = typeof body?.key === "string" ? body.key : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  const level = normalizeLevel(body?.level);

  if (!key || !message) {
    return NextResponse.json({ error: "key and message are required" }, { status: 400, headers: CORS_HEADERS });
  }

  const rate = checkRateLimit(`ingest:${key}`, RATE_LIMITS.errorIngest.limit, RATE_LIMITS.errorIngest.windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: CORS_HEADERS });
  }

  const project = await prisma.ingestProject.findUnique({ where: { publicKey: key } });
  if (!project) {
    return NextResponse.json({ error: "Unknown project key" }, { status: 404, headers: CORS_HEADERS });
  }

  const stackTrace = typeof body?.stackTrace === "string" ? body.stackTrace.slice(0, 10_000) : undefined;
  const url = typeof body?.url === "string" ? body.url.slice(0, 2000) : undefined;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500);
  const release = typeof body?.release === "string" ? body.release.slice(0, 100) : undefined;
  const environment = typeof body?.environment === "string" ? body.environment.slice(0, 50) : "production";
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : undefined;

  const fingerprint = fingerprintFor(level, message);
  const title = titleFor(message);

  const group = await prisma.errorGroup.upsert({
    where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
    create: { projectId: project.id, fingerprint, title, level, environment },
    update: {
      count: { increment: 1 },
      lastSeenAt: new Date(),
      // A fix that regresses should reopen the group, not silently pile
      // events into something marked resolved.
      resolvedAt: null,
    },
  });

  await prisma.errorEvent.create({
    data: { groupId: group.id, message, stackTrace, url, userAgent, release, metadata },
  });

  return NextResponse.json({ ok: true, groupId: group.id }, { status: 202, headers: CORS_HEADERS });
}
