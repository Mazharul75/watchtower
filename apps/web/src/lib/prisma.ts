import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust the
// Postgres connection pool by creating a new PrismaClient per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
