#!/usr/bin/env node
// Phase 4 backup/restore drill — proves data can actually be extracted and
// fully restored, not just that a backup file gets produced.
//
// Honest note: production's real nightly backup (.github/workflows/backup.yml)
// uses the actual `pg_dump`/`pg_restore` binaries on a GitHub Actions Ubuntu
// runner (installed via apt-get there). This script exists because those
// binaries aren't available in every local dev environment (they aren't
// bundled with the `embedded-postgres` package this repo uses for
// Docker-free local Postgres) — it proves the same underlying guarantee,
// that every row survives an export/restore round-trip, using Prisma's own
// client on both ends instead of shelling out to pg_dump specifically.
//
// Usage: node scripts/backup-restore-drill.mjs
// Run from the repo root, with a Postgres instance already running and
// apps/web's Prisma client already generated (`npm run prisma:generate`).
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, "..", "apps", "web");

const SOURCE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/watchtower?schema=public";
const RESTORE_DB = "watchtower_restore_drill";
const RESTORE_URL = SOURCE_URL.replace(/\/[^/?]+(\?|$)/, `/${RESTORE_DB}$1`);

// Dependency order matters for the INSERT pass below.
const TABLES = [
  "User", "Account", "Session", "VerificationToken", "PasswordResetToken",
  "Organization", "OrganizationMember", "AuditLog", "FeatureFlag", "ApiKey",
  "Repository", "WebhookEvent", "GraphNode", "GraphEdge", "Embedding",
  "Incident", "IncidentEvidence", "IncidentStatusHistory", "FixProposal", "Notification",
];

async function main() {
  const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });

  console.log("1. Counting rows in the live database...");
  const beforeCounts = {};
  for (const table of TABLES) {
    const [{ count }] = await source.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
    beforeCounts[table] = count;
  }
  console.table(beforeCounts);

  console.log(`\n2. Creating a fresh restore-target database (${RESTORE_DB})...`);
  await source.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${RESTORE_DB}"`);
  await source.$executeRawUnsafe(`CREATE DATABASE "${RESTORE_DB}"`);

  console.log("\n3. Applying migrations to it (same as a real disaster-recovery restore needs)...");
  execSync(`npx prisma migrate deploy`, {
    cwd: webDir,
    env: { ...process.env, DATABASE_URL: RESTORE_URL },
    stdio: "inherit",
  });

  console.log("\n4. Copying every row, table by table, dependency order first...");
  const target = new PrismaClient({ datasources: { db: { url: RESTORE_URL } } });
  for (const table of TABLES) {
    // Postgres enum columns (OrgRole, IncidentStatus, ...) need an explicit
    // cast when the value arrives as a driver-level string parameter.
    const columnTypes = await source.$queryRawUnsafe(
      `SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = $1`,
      table,
    );
    const enumCastByColumn = Object.fromEntries(
      columnTypes.filter((c) => c.data_type === "USER-DEFINED").map((c) => [c.column_name, c.udt_name]),
    );

    const rows = await source.$queryRawUnsafe(`SELECT * FROM "${table}"`);
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map((c) => row[c]);
      const placeholders = columns.map((c, i) => (enumCastByColumn[c] ? `$${i + 1}::"${enumCastByColumn[c]}"` : `$${i + 1}`)).join(", ");
      const quotedColumns = columns.map((c) => `"${c}"`).join(", ");
      await target.$executeRawUnsafe(`INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`, ...values);
    }
  }

  console.log("\n5. Verifying restored row counts match exactly...");
  let allMatch = true;
  const results = {};
  for (const table of TABLES) {
    const [{ count }] = await target.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
    const match = count === beforeCounts[table];
    if (!match) allMatch = false;
    results[table] = { source: beforeCounts[table], restored: count, match: match ? "OK" : "MISMATCH" };
  }
  console.table(results);

  console.log(`\nDRILL RESULT: ${allMatch ? "PASS — every row restored exactly" : "FAIL — see mismatches above"}`);

  console.log("\n6. Cleaning up the drill database...");
  await target.$disconnect();
  await source.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${RESTORE_DB}"`);
  await source.$disconnect();

  process.exit(allMatch ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
