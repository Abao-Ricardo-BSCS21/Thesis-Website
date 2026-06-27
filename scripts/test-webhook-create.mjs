import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

try {
  const w = await p.webhookEndpoint.create({
    data: {
      name: "Test",
      channel: "SMS",
      url: "http://localhost:5678/webhook/filcycle",
      events: ["OTP_SEND", "MANUAL_TEST"],
      isActive: true,
      isPrimary: false,
    },
  });
  console.log("OK", w.id);
  await p.webhookEndpoint.delete({ where: { id: w.id } });
} catch (e) {
  console.error("FAIL", e);
} finally {
  await p.$disconnect();
}
