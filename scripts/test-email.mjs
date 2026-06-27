/**
 * Test SMTP email: node scripts/test-email.mjs your@email.com
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.mjs your@email.com");
  process.exit(1);
}

const host = process.env.SMTP_HOST?.trim();
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim();
const from =
  process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || "FilCycle <noreply@filamer.edu>";
const secure = process.env.SMTP_SECURE === "true" || port === 465;

if (!host || !user || !pass) {
  console.error("❌ Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env first.");
  console.error("   Run: node scripts/check-email.mjs");
  process.exit(1);
}

const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

console.log(`Sending test email to ${to} via ${host}:${port}...`);

try {
  const info = await transporter.sendMail({
    from,
    to,
    subject: "FilCycle Email Test",
    text: "If you received this, SMTP is configured correctly for FilCycle email OTP.",
  });
  console.log("\n✅ Email sent.", info.messageId);
} catch (e) {
  console.error("\n❌ Email failed:", e.message);
  process.exit(1);
}
