/**
 * Ensures the default n8n webhook exists in FilCycle DB.
 * Run: node scripts/setup-n8n-webhook.mjs
 */
import { PrismaClient } from "@prisma/client";

const URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/filcycle";
const prisma = new PrismaClient();

const existing = await prisma.webhookEndpoint.findFirst({ where: { url: URL } });

if (existing) {
  if (!existing.isPrimary) {
    await prisma.webhookEndpoint.update({
      where: { id: existing.id },
      data: { isPrimary: true },
    });
    console.log("Updated webhook to Primary:", existing.name);
  } else {
    console.log("Webhook already configured:", existing.name, "→", existing.url);
  }
} else {
  const created = await prisma.webhookEndpoint.create({
    data: {
      name: "FilCycle n8n SMS",
      channel: "SMS",
      url: URL,
      events: ["OTP_SEND", "MANUAL_TEST", "STUDENT_REGISTER"],
      description: "n8n workflow — import n8n/filcycle-sms-email-workflow.json and activate",
      isActive: true,
      isPrimary: true,
    },
  });
  console.log("Created webhook:", created.name, "→", created.url);
}

// Quick connectivity check
try {
  const payload = {
    event: "MANUAL_TEST",
    channel: "SMS",
    timestamp: new Date().toISOString(),
    source: "filcycle",
    data: { test: true, phoneNumber: "+639171234567", message: "Setup check" },
  };
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("\nn8n probe:", res.status, text.slice(0, 200) || "(empty)");
  if (res.status === 404) {
    console.log("\n⚠️  n8n webhook not registered. In n8n: import workflow, ACTIVATE it, then re-run this script.");
  } else if (text.includes('"event"') && text.includes("MANUAL_TEST")) {
    console.log("\n✅ n8n workflow is active and responding correctly.");
  } else if (res.ok) {
    console.log("\n⚠️  n8n returned 200 but unexpected body. Re-import n8n/filcycle-sms-email-workflow.json");
  }
} catch (e) {
  console.log("\n❌ Cannot reach n8n at", URL);
  console.log("   Start n8n first, then import + activate the workflow.");
  console.log("   Error:", e.message);
}

await prisma.$disconnect();
