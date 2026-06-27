/**
 * Test your Semaphore API key: node scripts/test-semaphore.mjs [phone]
 * Example: node scripts/test-semaphore.mjs 09171234567
 */
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const apikey = env.match(/SEMAPHORE_API_KEY="([^"]+)"/)?.[1];
const sendername = env.match(/SEMAPHORE_SENDER_NAME="([^"]*)"/)?.[1]?.trim();
const testNumber = process.argv[2] || "09171234567";

if (!apikey) {
  console.error("No SEMAPHORE_API_KEY found in .env");
  process.exit(1);
}

const params = {
  apikey,
  number: testNumber,
  message: "FilCycle: Your verification code is 123456. Valid for 5 minutes.",
};
if (sendername) params.sendername = sendername;

const res = await fetch("https://api.semaphore.co/api/v4/messages", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(params),
});

const body = await res.text();
console.log("HTTP status:", res.status);
console.log("Response:", body);

if (body.includes("invalid")) {
  console.log("\n❌ API key is invalid. Copy the correct key from https://semaphore.co/account");
} else if (body.startsWith("[")) {
  console.log("\n✅ SMS queued successfully. Check your phone.");
}
