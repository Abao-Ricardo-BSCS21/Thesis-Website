import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const log = await p.webhookLog.findFirst({ orderBy: { createdAt: "desc" } });
console.log("Latest webhook payload:");
console.log(JSON.stringify(log?.payload, null, 2));

const wh = await p.webhookEndpoint.findMany();
console.log("\nWebhooks:");
for (const w of wh) {
  console.log({
    name: w.name,
    isPrimary: w.isPrimary,
    isActive: w.isActive,
    events: w.events,
    url: w.url,
  });
}

await p.$disconnect();
