// Apply supabase/migrations (and optionally the sample seed) to the hosted database.
//
//   npm run db:push    migrations only
//   npm run db:seed    migrations + supabase/seed.sql (SAMPLE data)
//
// Reads POSTGRES_URL_NON_POOLING from .env.local (`vercel env pull .env.local`).
// The connection string holds the database password, so it is never printed.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fine if the variable is already in the environment.
}

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error("POSTGRES_URL_NON_POOLING is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const cli = fileURLToPath(new URL("../node_modules/supabase/dist/supabase.js", import.meta.url));
const args = ["db", "push", "--db-url", url, "--yes"];
if (process.argv[2] === "seed") args.push("--include-seed");
if (process.argv.includes("--dry-run")) args.push("--dry-run");

// No shell: the URL is passed as a single argument and never interpreted.
const result = spawnSync(process.execPath, [cli, ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);
