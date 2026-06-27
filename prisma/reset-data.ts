/**
 * Soft reset: removes user-generated data but keeps pre-built demo accounts.
 * Demo accounts: admin, staff, and seed students (2021-10001, etc.)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ADMIN_EMAIL = "admin@filamer.edu";
const DEMO_STAFF_EMAIL = "staff@filamer.edu";
const DEMO_STUDENT_IDS = [
  "2021-10001",
  "2021-10002",
  "2022-10003",
  "2022-10004",
  "2023-10005",
  "2023-10006",
  "2021-10007",
  "2022-10008",
];

async function main() {
  console.log("🔄 Resetting user data (keeping pre-built accounts)...\n");

  const demoStudents = await prisma.student.findMany({
    where: { studentId: { in: DEMO_STUDENT_IDS } },
    select: { id: true, userId: true },
  });
  const demoStudentDbIds = demoStudents.map((s) => s.id);
  const demoUserIds = [
    ...(await prisma.user.findMany({
      where: { email: { in: [DEMO_ADMIN_EMAIL, DEMO_STAFF_EMAIL] } },
      select: { id: true },
    })).map((u) => u.id),
    ...demoStudents.map((s) => s.userId),
  ];

  // Webhooks & OTP (user-configured / runtime auth data)
  await prisma.webhookLog.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.otpVerification.deleteMany();

  // Activity data
  await prisma.bottle.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.rewardRedemption.deleteMany();
  await prisma.studentAchievement.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.machineLog.deleteMany();

  // Remove non-demo students (cascade deletes their users)
  const removedStudents = await prisma.student.deleteMany({
    where: { studentId: { notIn: DEMO_STUDENT_IDS } },
  });

  // Remove orphan users (registered via admin but not in demo list)
  const removedUsers = await prisma.user.deleteMany({
    where: { id: { notIn: demoUserIds } },
  });

  console.log(`  Removed ${removedStudents.count} non-demo student(s)`);
  console.log(`  Removed ${removedUsers.count} extra user account(s)`);
  console.log("  Cleared transactions, OTPs, webhooks, notifications\n");

  // Re-run seed to restore demo stats, rewards stock, machines, etc.
  console.log("🌱 Re-applying demo seed data...\n");
  const { execSync } = await import("child_process");
  execSync("tsx prisma/seed.ts", { stdio: "inherit", cwd: process.cwd() });

  console.log("\n✅ Reset complete — pre-built accounts preserved:");
  console.log("  Admin:   admin@filamer.edu / admin123");
  console.log("  Staff:   staff@filamer.edu / staff123");
  console.log("  Student: 2021-10001 / student123");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
