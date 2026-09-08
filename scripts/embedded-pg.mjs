#!/usr/bin/env node
/**
 * Runs a REAL Postgres server locally with zero Docker and zero manual
 * install, for local development and for verifying Prisma migrations
 * against genuine Postgres (not SQLite) before deploying to Supabase.
 *
 * `embedded-postgres` downloads the official community Postgres binaries
 * once (cached under .embedded-postgres/ in the repo root, gitignored) and
 * runs a normal postgres process against them — this is the same technique
 * widely used for CI database fixtures, not a toy/mock database.
 *
 * Usage:
 *   node scripts/embedded-pg.mjs up      # start, create the `watchtower` DB, print the connection string, keep running
 *   node scripts/embedded-pg.mjs down    # stop a background instance started with `up --detach`
 */
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", ".embedded-postgres");
const port = 55432;

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
});

const command = process.argv[2] ?? "up";

async function up() {
  const alreadyInitialized = fs.existsSync(path.join(dataDir, "PG_VERSION"));
  if (!alreadyInitialized) {
    await pg.initialise();
  }
  await pg.start();

  if (!alreadyInitialized) {
    await pg.createDatabase("watchtower");
    console.log("Created database 'watchtower'.");
  }

  const url = `postgresql://postgres:postgres@localhost:${port}/watchtower?schema=public`;
  console.log(`\nEmbedded Postgres is running.\nDATABASE_URL="${url}"\n`);
  console.log("Press Ctrl+C to stop.");

  process.on("SIGINT", async () => {
    await pg.stop();
    process.exit(0);
  });
}

async function down() {
  try {
    await pg.stop();
    console.log("Embedded Postgres stopped.");
  } catch (err) {
    console.error("Nothing appears to be running, or it already stopped.", err.message);
  }
}

if (command === "up") {
  await up();
} else if (command === "down") {
  await down();
} else {
  console.error(`Unknown command "${command}". Use "up" or "down".`);
  process.exit(1);
}
