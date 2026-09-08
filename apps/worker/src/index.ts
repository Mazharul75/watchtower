import { PrismaClient } from "@prisma/client";
import { cleanupExpiredTokens } from "./jobs/cleanup-expired-tokens";

const JOBS: Record<string, (prisma: PrismaClient) => Promise<unknown>> = {
  "cleanup-expired-tokens": (prisma) => cleanupExpiredTokens(prisma),
};

async function main() {
  const jobName = process.argv[2];
  const job = jobName ? JOBS[jobName] : undefined;

  if (!job) {
    console.error(`Usage: tsx src/index.ts <job-name>\nAvailable jobs: ${Object.keys(JOBS).join(", ")}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const result = await job(prisma);
    console.log(`[worker] ${jobName} completed:`, result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[worker] job failed:", err);
  process.exit(1);
});
