/**
 * Validate SMTP email config in .env
 * Run: node scripts/check-email.mjs
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

function env(key) {
  const v = process.env[key];
  return v?.trim() || "";
}

const provider = env("EMAIL_PROVIDER");
console.log("EMAIL_PROVIDER:", provider || "(auto-detect from SMTP_*)");
console.log("SMTP_HOST:", env("SMTP_HOST") || "MISSING");
console.log("SMTP_PORT:", env("SMTP_PORT") || "587 (default)");
console.log("SMTP_USER:", env("SMTP_USER") ? env("SMTP_USER").slice(0, 3) + "..." : "MISSING");
console.log("SMTP_PASS:", env("SMTP_PASS") ? "set" : "MISSING");
console.log("SMTP_FROM:", env("SMTP_FROM") || "(uses SMTP_USER)");

const host = env("SMTP_HOST");
const user = env("SMTP_USER");
const pass = env("SMTP_PASS");

if (provider === "mock" || (!host && !user && !pass)) {
  console.log("\n⚠️  Using MockEmail — OTP codes print in the server console only.");
  console.log("   Set SMTP_* in .env for real email delivery.");
  process.exit(0);
}

if (!host || !user || !pass) {
  console.log("\n❌ Incomplete SMTP config.");
  console.log("1. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
  console.log("2. For Gmail: use an App Password (not your login password)");
  console.log("3. Run: node scripts/test-email.mjs your@email.com");
  process.exit(1);
}

console.log("\n✅ SMTP config looks complete. Run: node scripts/test-email.mjs your@email.com");
