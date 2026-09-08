import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Seeds a repo + issue node directly via Prisma (webhook ingestion into the
// graph is already covered by graph-builder.test.ts and the live
// signed-webhook verification described in the completion report) so this
// suite can focus on what it's actually testing: the investigation UI and
// the honest-abstention path when no LLM provider is configured — which is
// exactly CI's condition, so this never depends on a real or stubbed LLM.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@watchtower.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

test.describe("Incident investigation", () => {
  test("investigating an issue with no LLM provider configured honestly abstains, never fabricates a hypothesis", async ({ page }) => {
    const prisma = new PrismaClient();

    await prisma.featureFlag.upsert({
      where: { key: "phase2.github_ingestion" },
      update: { enabled: true },
      create: { key: "phase2.github_ingestion", enabled: true },
    });

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
    const suffix = Date.now();
    const org = await prisma.organization.create({
      data: { name: `Investigation E2E ${suffix}`, slug: `investigation-e2e-${suffix}`, members: { create: { userId: admin.id, role: "OWNER" } } },
    });
    const repo = await prisma.repository.create({
      data: {
        organizationId: org.id,
        installationId: "test",
        githubRepoId: `e2e-${suffix}`,
        owner: "acme",
        name: `repo-${suffix}`,
        fullName: `acme/repo-${suffix}`,
      },
    });
    const node = await prisma.graphNode.create({
      data: { repositoryId: repo.id, type: "ISSUE", externalId: "1", title: "Something is broken", body: "It just is.", url: "https://example.com", state: "open" },
    });

    try {
      await page.goto("/login");
      await page.getByLabel("Email").fill(ADMIN_EMAIL);
      await page.getByLabel("Password").fill(ADMIN_PASSWORD);
      await page.getByRole("button", { name: /^log in$/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto(`/dashboard/repos/${repo.id}`);
      await page.getByRole("button", { name: /investigate/i }).click();

      await expect(page).toHaveURL(/\/dashboard\/incidents\//);
      await expect(page.getByText(/watchtower abstained/i)).toBeVisible();
      // Never shown alongside an abstention — a fabricated-looking hypothesis would be a real bug.
      await expect(page.getByText(/proposed approach/i)).not.toBeVisible();
    } finally {
      await prisma.incident.deleteMany({ where: { triggerNodeId: node.id } });
      await prisma.$disconnect();
    }
  });
});
