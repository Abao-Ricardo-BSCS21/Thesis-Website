import prisma from "@/lib/prisma";
import {
  LogLevel,
  NotificationType,
  Prisma,
  RequirementType,
  TransactionType,
} from "@prisma/client";
import { BOTTLE_WEIGHT_KG, POINTS_PER_BOTTLE } from "@/lib/utils";

export async function processBottleSubmission(
  studentDbId: string,
  machineId?: string,
  weightGrams?: number
) {
  const weight = weightGrams ?? BOTTLE_WEIGHT_KG * 1000;
  const points = POINTS_PER_BOTTLE;

  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id: studentDbId },
      data: {
        rewardPoints: { increment: points },
        bottlesRecycled: { increment: 1 },
      },
    });

    const transaction = await tx.transaction.create({
      data: {
        studentId: studentDbId,
        type: TransactionType.BOTTLE_SUBMISSION,
        bottleCount: 1,
        pointsEarned: points,
        weightKg: weight / 1000,
        machineId,
        bottle: {
          create: {
            material: "PET",
            weightGrams: weight,
            isValid: true,
          },
        },
      },
      include: { bottle: true },
    });

    if (machineId) {
      await tx.machine.update({
        where: { id: machineId },
        data: { bottlesStored: { increment: 1 } },
      });
    }

    await tx.notification.create({
      data: {
        userId: student.userId,
        title: "Bottle Accepted!",
        message: `You earned ${points} reward points for recycling a plastic bottle.`,
        type: NotificationType.BOTTLE_ACCEPTED,
      },
    });

    return { student, transaction };
  });

  await checkAndUnlockAchievements(studentDbId);

  return result;
}

export async function checkAndUnlockAchievements(studentDbId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentDbId },
    include: {
      achievements: { include: { achievement: true } },
    },
  });

  if (!student) return [];

  const allAchievements = await prisma.achievement.findMany();
  const unlockedIds = new Set(student.achievements.map((a) => a.achievementId));
  const newlyUnlocked = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;

    let qualifies = false;

    if (achievement.requirementType === RequirementType.BOTTLE_COUNT) {
      qualifies = student.bottlesRecycled >= achievement.requirement;
    } else if (achievement.requirementType === RequirementType.POINTS_EARNED) {
      qualifies = student.rewardPoints >= achievement.requirement;
    }

    if (qualifies) {
      await prisma.$transaction(async (tx) => {
        await tx.studentAchievement.create({
          data: { studentId: studentDbId, achievementId: achievement.id },
        });

        if (achievement.pointsBonus > 0) {
          await tx.student.update({
            where: { id: studentDbId },
            data: { rewardPoints: { increment: achievement.pointsBonus } },
          });
        }

        await tx.notification.create({
          data: {
            userId: student.userId,
            title: "Achievement Unlocked!",
            message: `You unlocked "${achievement.name}" — ${achievement.description}`,
            type: NotificationType.ACHIEVEMENT_UNLOCKED,
            metadata: { achievementId: achievement.id },
          },
        });
      });

      newlyUnlocked.push(achievement);
    }
  }

  await updateStudentRanks();
  return newlyUnlocked;
}

export async function updateStudentRanks() {
  const students = await prisma.student.findMany({
    orderBy: { bottlesRecycled: "desc" },
    select: { id: true },
  });

  await Promise.all(
    students.map((student, index) =>
      prisma.student.update({
        where: { id: student.id },
        data: { rank: index + 1 },
      })
    )
  );
}

export async function notifyAdmins(
  title: string,
  message: string,
  type: NotificationType
) {
  const admins = await prisma.user.findMany({
    where: { role: { name: "ADMINISTRATOR" } },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title,
      message,
      type,
    })),
  });
}

export async function logMachineEvent(
  machineId: string,
  message: string,
  level: LogLevel = LogLevel.INFO,
  metadata?: Prisma.InputJsonValue
) {
  return prisma.machineLog.create({
    data: { machineId, message, level, metadata: metadata ?? {} },
  });
}

export async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalBottles,
    todayBottles,
    totalPoints,
    machines,
    totalWeight,
    recentTransactions,
    topContributors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.aggregate({ _sum: { bottlesRecycled: true } }),
    prisma.transaction.count({
      where: {
        type: TransactionType.BOTTLE_SUBMISSION,
        createdAt: { gte: today },
      },
    }),
    prisma.student.aggregate({ _sum: { rewardPoints: true } }),
    prisma.machine.findMany(),
    prisma.transaction.aggregate({
      where: { type: TransactionType.BOTTLE_SUBMISSION },
      _sum: { weightKg: true },
    }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
      },
    }),
    prisma.student.findMany({
      take: 5,
      orderBy: { bottlesRecycled: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        bottlesRecycled: true,
        rewardPoints: true,
        rank: true,
      },
    }),
  ]);

  return {
    totalUsers,
    totalBottles: totalBottles._sum.bottlesRecycled ?? 0,
    todayBottles,
    totalPoints: totalPoints._sum.rewardPoints ?? 0,
    plasticCollectedKg: totalWeight._sum.weightKg ?? 0,
    machines,
    recentTransactions,
    topContributors,
  };
}

export async function getChartData(period: "daily" | "weekly" | "monthly") {
  const now = new Date();
  let startDate: Date;
  let groupFormat: string;

  switch (period) {
    case "daily":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      groupFormat = "day";
      break;
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 56);
      groupFormat = "week";
      break;
    case "monthly":
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      groupFormat = "month";
      break;
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      type: TransactionType.BOTTLE_SUBMISSION,
      createdAt: { gte: startDate },
    },
    select: { createdAt: true, bottleCount: true, pointsEarned: true, weightKg: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped = new Map<string, { bottles: number; points: number; weight: number }>();

  for (const tx of transactions) {
    const date = new Date(tx.createdAt);
    let key: string;

    if (groupFormat === "day") {
      key = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } else if (groupFormat === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = `Week ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      key = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    const existing = grouped.get(key) ?? { bottles: 0, points: 0, weight: 0 };
    existing.bottles += tx.bottleCount;
    existing.points += tx.pointsEarned;
    existing.weight += tx.weightKg ?? 0;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    bottles: data.bottles,
    points: data.points,
    weight: Math.round(data.weight * 100) / 100,
  }));
}

export async function getLeaderboard(period: "weekly" | "monthly" | "allTime") {
  const now = new Date();
  let dateFilter: Date | undefined;

  if (period === "weekly") {
    dateFilter = new Date(now);
    dateFilter.setDate(dateFilter.getDate() - 7);
  } else if (period === "monthly") {
    dateFilter = new Date(now);
    dateFilter.setMonth(dateFilter.getMonth() - 1);
  }

  if (period === "allTime") {
    return prisma.student.findMany({
      take: 20,
      orderBy: { bottlesRecycled: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentId: true,
        bottlesRecycled: true,
        rewardPoints: true,
        rank: true,
        profilePicture: true,
        course: true,
      },
    });
  }

  const transactions = await prisma.transaction.groupBy({
    by: ["studentId"],
    where: {
      type: TransactionType.BOTTLE_SUBMISSION,
      createdAt: { gte: dateFilter },
    },
    _sum: { bottleCount: true, pointsEarned: true },
    orderBy: { _sum: { bottleCount: "desc" } },
    take: 20,
  });

  const studentIds = transactions.map((t) => t.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentId: true,
      bottlesRecycled: true,
      rewardPoints: true,
      rank: true,
      profilePicture: true,
      course: true,
    },
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  return transactions.map((t, index) => {
    const student = studentMap.get(t.studentId)!;
    return {
      ...student,
      bottlesRecycled: t._sum.bottleCount ?? 0,
      rewardPoints: t._sum.pointsEarned ?? 0,
      rank: index + 1,
    };
  });
}
