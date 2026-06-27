/**
 * Test SMS API PH: node scripts/test-sms.mjs 09XXXXXXXXX
 */
import { readFileSync } from "fs";

function env(name) {
  const content = readFileSync(".env", "utf8");
  const match = content.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1] ?? "";
}

const apiKey = env("SMS_API_KEY") || env("SEMAPHORE_API_KEY");
const baseUrl = env("SMS_API_BASE_URL") || "https://smsapiph.onrender.com";
const phone = process.argv[2] || "09171234567";
const recipient = phone.startsWith("+") ? phone : `+63${phone.replace(/^0/, "")}`;

if (!apiKey) {
  console.error("No SMS_API_KEY in .env");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/v1/send/sms`, {
  method: "POST",
  headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify({
    recipient,
    message: "FilCycle test: Your verification code is 123456",
  }),
});

const body = await res.text();
console.log("Provider: SMS API PH");
console.log("Phone:", recipient);
console.log("HTTP status:", res.status);
console.log("Response:", body);

if (res.ok && body.includes('"success":true')) {
  console.log("\n✅ SMS sent. Check your phone.");
} else {
  console.log("\n❌ SMS failed.");
}
