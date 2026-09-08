/**
 * Idempotent dev/staging seed: creates one super-admin account (credentials
 * printed to the console — change the password immediately in anything
 * beyond local dev) and the Phase 2/3 feature flags in their default (off)
 * state, so the admin console's Feature Flags tab has real rows to show
 * from a clean database instead of an empty list.
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@watchtower.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username: "admin",
      name: "Watchtower Admin",
      passwordHash,
      emailVerified: new Date(),
      isSuperAdmin: true,
    },
  });

  await prisma.featureFlag.upsert({
    where: { key: "phase2.github_ingestion" },
    update: {},
    create: { key: "phase2.github_ingestion", enabled: false, description: "GitHub App installation and repo ingestion (Phase 2)." },
  });

  await prisma.featureFlag.upsert({
    where: { key: "phase3.ai_rca" },
    update: {},
    create: { key: "phase3.ai_rca", enabled: false, description: "AI-generated root-cause analysis on incidents (Phase 3)." },
  });

  console.log(`\nSeed complete.`);
  console.log(`Super admin: ${admin.email} / ${password} (dev only — change immediately elsewhere)\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
