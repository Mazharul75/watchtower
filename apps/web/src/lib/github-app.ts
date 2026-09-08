import "server-only";
import { App } from "octokit";

/**
 * A GitHub App is a separate registration from the GitHub OAuth App used
 * for login (see auth.ts) — this one is what a user installs on their
 * repos, and is what receives webhooks. Not configuring these env vars
 * doesn't break the rest of Watchtower; every route in this file simply
 * throws a clear "not configured" error until you create the App and set
 * them (see README's GitHub App section).
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Create a GitHub App (see README) and set GITHUB_APP_ID, ` +
        `GITHUB_APP_PRIVATE_KEY, GITHUB_APP_WEBHOOK_SECRET, and GITHUB_APP_SLUG.`,
    );
  }
  return value;
}

let cachedApp: App | null = null;

export function getGitHubApp(): App {
  if (cachedApp) return cachedApp;

  const appId = getRequiredEnv("GITHUB_APP_ID");
  // Private keys are usually stored with literal "\n" sequences in env vars
  // (since a real newline can't survive most .env / secret-manager UIs).
  const privateKey = getRequiredEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const webhookSecret = getRequiredEnv("GITHUB_APP_WEBHOOK_SECRET");

  cachedApp = new App({ appId, privateKey, webhooks: { secret: webhookSecret } });
  return cachedApp;
}

export function getGitHubAppSlug(): string {
  return getRequiredEnv("GITHUB_APP_SLUG");
}

export async function getInstallationOctokit(installationId: string) {
  const app = getGitHubApp();
  return app.getInstallationOctokit(Number(installationId));
}
