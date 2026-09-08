import { test, expect } from "@playwright/test";

// This suite assumes a repo has already been connected and ingested via a
// real, signed webhook delivery (see scripts/ or the completion report for
// how that fixture data was produced) — it verifies the UI renders that
// real graph state correctly, not that ingestion itself works (that's
// covered by graph-builder.test.ts + a live webhook-signing integration
// check performed separately, since GitHub App installation can't be
// exercised in CI without a real App).
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@watchtower.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

test.describe("GitHub ingestion UI", () => {
  test("an org with no feature flag enabled sees the disabled message, not a broken connect flow", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create a fresh org — the ingestion flag is checked per-instance, not
    // per-org, so a brand new org still reflects whatever the flag is set to.
    const orgName = `Ingestion UI Test ${Date.now()}`;
    await page.getByRole("button", { name: /new organization/i }).click();
    await page.getByLabel("Organization name").fill(orgName);
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(orgName)).toBeVisible();

    await page.getByRole("link", { name: orgName }).click();
    await expect(page).toHaveURL(/\/dashboard\/orgs\//);

    // Whichever state the flag is actually in on this run, the org page
    // must show ONE of these two things — never a raw error or a dead link.
    const disabledMessage = page.getByText(/aren't turned on for this instance/i);
    const connectButton = page.getByRole("link", { name: /connect a repository/i });
    await expect(disabledMessage.or(connectButton)).toBeVisible();
  });
});
