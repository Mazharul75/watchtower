import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Phase 4's accessibility pass: an automated WCAG 2.1 AA scan (axe-core) on
// every publicly reachable page and the two key authenticated screens.
// This catches contrast, missing labels, and ARIA issues automatically —
// it does not replace manual keyboard-navigation and screen-reader testing,
// which is documented as a manual step in docs/LAUNCH_CHECKLIST.md.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@watchtower.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password"];

for (const path of PUBLIC_PAGES) {
  test(`accessibility: ${path} has no automatically detectable WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("accessibility: dashboard (authenticated) has no automatically detectable WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
