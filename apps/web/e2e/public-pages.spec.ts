import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page renders the hero and CTAs", async ({ page }) => {
    await page.goto("/");
    // Scoped to level:1 — the page also has an h2 ("Inside GitHub
    // Engineering Memory") and an h3 (the GitHub solution card's title)
    // that a looser match would collide with.
    await expect(page.getByRole("heading", { name: /engineering platform/i, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /get started free/i }).first()).toBeVisible();
  });

  test("unknown route renders the branded 404 page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });

  test("dashboard redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin console redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
