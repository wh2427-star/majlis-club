import { execSync } from "node:child_process";

// Reset the demo data so every run starts from the same state.
export default function globalSetup() {
  if (process.env.SKIP_SEED === "1") return;
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
}
