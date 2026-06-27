const registerBody = {
  studentId: "2024-99998",
  fullName: "Webhook Test",
  course: "BS Computer Science",
  year: 1,
  phoneNumber: "09171234567",
  email: "",
  password: "test123",
  confirmPassword: "test123",
};

console.log("1. Testing n8n webhook reachability...");
try {
  const n8n = await fetch("http://localhost:5678/webhook/filcycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "OTP_SEND", channel: "SMS", source: "filcycle", data: { test: true } }),
  });
  console.log("   n8n status:", n8n.status, await n8n.text());
} catch (e) {
  console.log("   n8n FAILED:", e.message);
}

console.log("\n2. Testing registration API...");
try {
  const reg = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerBody),
  });
  const text = await reg.text();
  console.log("   register status:", reg.status);
  console.log("   register body:", text.slice(0, 500));
} catch (e) {
  console.log("   register FAILED:", e.message);
}

console.log("\n3. Webhook logs from DB...");
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const logs = await p.webhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
console.log(logs.map((l) => ({ event: l.event, status: l.status, statusCode: l.statusCode, response: l.response?.slice(0, 80) })));
await p.$disconnect();
