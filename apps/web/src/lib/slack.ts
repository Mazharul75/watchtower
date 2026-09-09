import "server-only";

/**
 * Real Slack Incoming Webhook delivery — no Slack app install needed, just
 * a webhook URL the org owner pastes in from Slack's own
 * "Incoming Webhooks" app config (api.slack.com/messaging/webhooks), free
 * on any Slack workspace. Best-effort: a failed Slack post never blocks or
 * fails the caller — the in-app Notification row is always the source of
 * truth, Slack is a convenience on top of it.
 */
export async function postToSlack(webhookUrl: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return { ok: false, error: `Slack returned HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
