import {
  PrismaClient,
  RoleName,
  RewardCategory,
  RequirementType,
  MachineStatus,
  TransactionType,
  LogLevel,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding FilCycle database...");

  // Roles
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMINISTRATOR },
    update: {},
    create: { name: RoleName.ADMINISTRATOR },
  });
  const staffRole = await prisma.role.upsert({
    where: { name: RoleName.STAFF },
    update: {},
    create: { name: RoleName.STAFF },
  });
  const studentRole = await prisma.role.upsert({
    where: { name: RoleName.STUDENT },
    update: {},
    create: { name: RoleName.STUDENT },
  });

  const adminPassword = await bcrypt.hash("admin123", 12);
  const staffPassword = await bcrypt.hash("staff123", 12);
  const studentPassword = await bcrypt.hash("student123", 12);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@filamer.edu" },
    update: {},
    create: {
      email: "admin@filamer.edu",
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  // Staff
  await prisma.user.upsert({
    where: { email: "staff@filamer.edu" },
    update: {},
    create: {
      email: "staff@filamer.edu",
      password: staffPassword,
      roleId: staffRole.id,
    },
  });

  // Students
  const studentData = [
    { studentId: "2021-10001", firstName: "Maria", lastName: "Santos", course: "BS Computer Science", year: 3, bottles: 245, points: 2450, phone: "+639171000001" },
    { studentId: "2021-10002", firstName: "James", lastName: "Rivera", course: "BS Environmental Science", year: 4, bottles: 198, points: 1980, phone: "+639171000002" },
    { studentId: "2022-10003", firstName: "Ana", lastName: "Garcia", course: "BS Information Technology", year: 2, bottles: 156, points: 1560, phone: "+639171000003" },
    { studentId: "2022-10004", firstName: "Carlos", lastName: "Mendoza", course: "BS Computer Engineering", year: 2, bottles: 134, points: 1340, phone: "+639171000004" },
    { studentId: "2023-10005", firstName: "Sofia", lastName: "Reyes", course: "BS Computer Science", year: 1, bottles: 89, points: 890, phone: "+639171000005" },
    { studentId: "2023-10006", firstName: "Miguel", lastName: "Torres", course: "BS Information Technology", year: 1, bottles: 67, points: 670, phone: "+639171000006" },
    { studentId: "2021-10007", firstName: "Isabella", lastName: "Cruz", course: "BS Environmental Science", year: 3, bottles: 112, points: 1120, phone: "+639171000007" },
    { studentId: "2022-10008", firstName: "Daniel", lastName: "Lim", course: "BS Computer Science", year: 2, bottles: 78, points: 780, phone: "+639171000008" },
  ];

  for (const s of studentData) {
    const existing = await prisma.student.findUnique({ where: { studentId: s.studentId } });
    if (!existing) {
      await prisma.student.create({
        data: {
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          course: s.course,
          year: s.year,
          phoneNumber: s.phone,
          phoneVerified: true,
          rewardPoints: s.points,
          bottlesRecycled: s.bottles,
          user: {
            create: {
              email: `${s.firstName.toLowerCase()}@student.edu`,
              password: studentPassword,
              roleId: studentRole.id,
            },
          },
        },
      });
    } else {
      await prisma.student.update({
        where: { studentId: s.studentId },
        data: {
          firstName: s.firstName,
          lastName: s.lastName,
          course: s.course,
          year: s.year,
          phoneNumber: s.phone,
          phoneVerified: true,
          rewardPoints: s.points,
          bottlesRecycled: s.bottles,
        },
      });
      const linked = await prisma.student.findUnique({
        where: { studentId: s.studentId },
        select: { userId: true },
      });
      if (linked) {
        await prisma.user.update({
          where: { id: linked.userId },
          data: { isActive: true, password: studentPassword },
        });
      }
    }
  }

  // Achievements
  const achievements = [
    { name: "First Bottle", description: "Recycle your first bottle", icon: "🌱", requirement: 1, requirementType: RequirementType.BOTTLE_COUNT, pointsBonus: 5 },
    { name: "100 Bottles", description: "Recycle 100 bottles", icon: "♻️", requirement: 100, requirementType: RequirementType.BOTTLE_COUNT, pointsBonus: 50 },
    { name: "500 Bottles", description: "Recycle 500 bottles", icon: "🏆", requirement: 500, requirementType: RequirementType.BOTTLE_COUNT, pointsBonus: 200 },
    { name: "1000 Bottles", description: "Recycle 1000 bottles", icon: "👑", requirement: 1000, requirementType: RequirementType.BOTTLE_COUNT, pointsBonus: 500 },
    { name: "Eco Warrior", description: "Earn 500 reward points", icon: "⚔️", requirement: 500, requirementType: RequirementType.POINTS_EARNED, pointsBonus: 25 },
    { name: "Plastic Hero", description: "Earn 2000 reward points", icon: "🦸", requirement: 2000, requirementType: RequirementType.POINTS_EARNED, pointsBonus: 100 },
    { name: "Planet Saver", description: "Earn 5000 reward points", icon: "🌍", requirement: 5000, requirementType: RequirementType.POINTS_EARNED, pointsBonus: 250 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { name: a.name },
      update: {},
      create: a,
    });
  }

  // Rewards
  const rewards = [
    { name: "Coffee Voucher", description: "Free coffee at campus café", category: RewardCategory.COFFEE_VOUCHER, pointsCost: 50, stock: 100 },
    { name: "University Hoodie", description: "Official university merchandise hoodie", category: RewardCategory.MERCHANDISE, pointsCost: 500, stock: 25 },
    { name: "Campus T-Shirt", description: "FilCycle branded t-shirt", category: RewardCategory.MERCHANDISE, pointsCost: 300, stock: 50 },
    { name: "₱100 Cash Reward", description: "Cash reward credited to student account", category: RewardCategory.CASH, pointsCost: 200, stock: 30 },
    { name: "University Credit Points", description: "50 university credit points", category: RewardCategory.UNIVERSITY_POINTS, pointsCost: 150, stock: 75 },
    { name: "₱500 Gift Card", description: "Gift card for partner stores", category: RewardCategory.GIFT_CARD, pointsCost: 800, stock: 15 },
    { name: "Notebook Set", description: "Eco-friendly notebook and pen set", category: RewardCategory.MERCHANDISE, pointsCost: 100, stock: 60 },
    { name: "Premium Coffee Pass", description: "Weekly unlimited coffee pass", category: RewardCategory.COFFEE_VOUCHER, pointsCost: 250, stock: 20 },
  ];

  for (const r of rewards) {
    const existing = await prisma.reward.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.reward.create({ data: r });
    }
  }

  // Machines
  const machines = [
    { name: "FilCycle Unit A", location: "FCU Main Library Entrance", status: MachineStatus.ONLINE, bottlesStored: 127, bottleCapacity: 500, temperature: 24.5 },
    { name: "FilCycle Unit B", location: "FCU Engineering Building", status: MachineStatus.ONLINE, bottlesStored: 89, bottleCapacity: 500, temperature: 25.1 },
    { name: "FilCycle Unit C", location: "FCU Student Center", status: MachineStatus.ONLINE, bottlesStored: 203, bottleCapacity: 500, temperature: 23.8 },
    { name: "FilCycle Unit D", location: "FCU Science Building", status: MachineStatus.MAINTENANCE, bottlesStored: 45, bottleCapacity: 500, temperature: 26.0 },
  ];

  for (const m of machines) {
    const existing = await prisma.machine.findFirst({ where: { name: m.name } });
    if (!existing) {
      const machine = await prisma.machine.create({
        data: {
          ...m,
          lastMaintenance: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.machineLog.createMany({
        data: [
          { machineId: machine.id, level: LogLevel.INFO, message: "Machine initialized and online" },
          { machineId: machine.id, level: LogLevel.INFO, message: "Daily maintenance check completed" },
          { machineId: machine.id, level: LogLevel.INFO, message: "Storage level at 25% capacity" },
        ],
      });
    }
  }

  // Sample transactions for charts
  const students = await prisma.student.findMany();
  const machine = await prisma.machine.findFirst();

  if (students.length > 0 && machine) {
    const existingTx = await prisma.transaction.count();
    if (existingTx === 0) {
      for (let day = 30; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        const txCount = Math.floor(Math.random() * 15) + 5;

        for (let i = 0; i < txCount; i++) {
          const student = students[Math.floor(Math.random() * students.length)];
          date.setHours(Math.floor(Math.random() * 12) + 7);

          await prisma.transaction.create({
            data: {
              studentId: student.id,
              type: TransactionType.BOTTLE_SUBMISSION,
              bottleCount: 1,
              pointsEarned: 10,
              weightKg: 0.025,
              machineId: machine.id,
              createdAt: new Date(date),
              bottle: {
                create: {
                  material: "PET",
                  weightGrams: 20 + Math.random() * 10,
                  isValid: true,
                },
              },
            },
          });
        }
      }
    }
  }

  // Settings
  const settings = [
    { key: "points_per_bottle", value: "10" },
    { key: "max_daily_submissions", value: "50" },
    { key: "machine_capacity_warning", value: "90" },
    { key: "nfc_enabled", value: "false" },
    { key: "app_name", value: "FilCycle" },
  ];

  for (const s of settings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // Update ranks
  const allStudents = await prisma.student.findMany({ orderBy: { bottlesRecycled: "desc" } });
  for (let i = 0; i < allStudents.length; i++) {
    await prisma.student.update({
      where: { id: allStudents[i].id },
      data: { rank: i + 1 },
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("\nDemo Credentials:");
  console.log("  Admin:   admin@filamer.edu / admin123");
  console.log("  Staff:   staff@filamer.edu / staff123");
  console.log("  Student: 2021-10001 / student123");

  // Default n8n webhook (local dev — update URL in Admin → Webhooks if n8n runs elsewhere)
  const existingWebhook = await prisma.webhookEndpoint.findFirst({
    where: { url: "http://localhost:5678/webhook/filcycle" },
  });
  if (!existingWebhook) {
    await prisma.webhookEndpoint.create({
      data: {
        name: "FilCycle n8n SMS",
        channel: "SMS",
        url: "http://localhost:5678/webhook/filcycle",
        events: ["OTP_SEND", "MANUAL_TEST", "STUDENT_REGISTER"],
        description: "Local n8n workflow — import n8n/filcycle-sms-email-workflow.json and activate",
        isActive: true,
        isPrimary: true,
      },
    });
    console.log("\n  n8n webhook: http://localhost:5678/webhook/filcycle (added to Admin → Webhooks)");
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
