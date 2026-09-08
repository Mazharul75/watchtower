import { test, expect } from "@playwright/test";

// Exercises the REAL login form against the super-admin account created by
// `npm run prisma:seed` (see prisma/seed.ts) — no mocked auth, no bypass.
// Requires the app to be running against a database that has been seeded.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@watchtower.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

test.describe("credentials login + RBAC", () => {
  test("rejects an incorrect password with a clear error, no redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs the seeded super admin in, reaches the dashboard, and can open the admin console", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();

    // Server-rendered admin link only appears because dbUser.isSuperAdmin is true.
    await page.getByRole("link", { name: /admin console/i }).click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { name: /platform admin console/i })).toBeVisible();

    // Lands on System health by default — real, live-fetched counts, not zeroes baked into markup.
    await expect(page.getByText("Organizations", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /^users$/i }).click();
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible({ timeout: 10_000 });
  });

  test("creating an organization makes it appear immediately and grants OWNER role", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const orgName = `E2E Org ${Date.now()}`;
    await page.getByRole("button", { name: /new organization/i }).click();
    await page.getByLabel("Organization name").fill(orgName);
    await page.getByRole("button", { name: /^create$/i }).click();

    // Scoped to this org's own list item — the dashboard accumulates one row
    // per organization the account belongs to, and (by design) every one of
    // them shows an OWNER/ADMIN/MEMBER/VIEWER badge, so an unscoped
    // getByText("OWNER") matches every prior org's badge too.
    const row = page.getByRole("listitem").filter({ hasText: orgName });
    await expect(row).toBeVisible();
    await expect(row.getByText("OWNER")).toBeVisible();
  });

  test("signing out clears the session and protected routes redirect again", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
