import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs the organizationId that initiated a GitHub App installation into
 * the `state` query param GitHub round-trips back to our callback —
 * stateless CSRF protection (no DB row to create/expire) using the same
 * AUTH_SECRET Auth.js already trusts.
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return secret;
}

export function signInstallState(organizationId: string): string {
  const payload = `${organizationId}.${Date.now()}`;
  const signature = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

const STATE_TTL_MS = 15 * 60 * 1000; // installation flow should complete within 15 minutes

export function verifyInstallState(state: string): { organizationId: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [organizationId, timestampStr, signature] = decoded.split(".");
    if (!organizationId || !timestampStr || !signature) return null;

    const expectedSignature = createHmac("sha256", getSecret()).update(`${organizationId}.${timestampStr}`).digest("hex");
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const timestamp = Number(timestampStr);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > STATE_TTL_MS) return null;

    return { organizationId };
  } catch {
    return null;
  }
}
