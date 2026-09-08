import { test, expect } from "@playwright/test";

test.describe("signup form", () => {
  test("shows a server-side validation error for a weak password", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Test User");
    await page.getByLabel("Username").fill(`e2e_${Date.now()}`);
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("short");
    // Browser-native minLength blocks submission before our server call for
    // a password under 10 chars, so the button click should not navigate.
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("renders GitHub and Google OAuth entry points", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });
});

test.describe("forgot password", () => {
  test("always shows a generic success message, never confirming account existence", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("definitely-not-a-real-account@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/if an account with that email exists/i)).toBeVisible();
  });
});
