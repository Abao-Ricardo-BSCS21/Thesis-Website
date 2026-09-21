import { NextRequest } from "next/server";
import { AchievementScope, RoleName } from "@prisma/client";
import { apiError, apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getMonthlyRecyclingStats } from "@/lib/services/recycling-service";
import {
  formatPeriodLabel,
  getCurrentPeriodKey,
  getLifetimePeriodKey,
} from "@/lib/utils/achievement-period";

/**
 * Achievements for the logged-in student:
 * - LIFETIME unlocks stay forever
 * - MONTHLY unlocks only count for the current calendar month
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.STUDENT]);
  if (error) return error;

  const student = await prisma.student.findFirst({
    where: { userId: session!.user.id },
    select: {
      id: true,
      bottlesRecycled: true,
      rewardPoints: true,
      achievements: {
        include: { achievement: true },
      },
    },
  });

  if (!student) return apiError("Student profile not found", 404);

  const catalog = await prisma.achievement.findMany({
    orderBy: [{ scope: "asc" }, { requirement: "asc" }],
  });

  const monthly = await getMonthlyRecyclingStats(student.id);
  const lifetimeKey = getLifetimePeriodKey();
  const monthKey = getCurrentPeriodKey();

  const unlocked = student.achievements.filter((ua) => {
    if (ua.achievement.scope === AchievementScope.LIFETIME) {
      return ua.periodKey === lifetimeKey;
    }
    return ua.periodKey === monthKey;
  });

  const unlockedNames = new Set(unlocked.map((u) => u.achievement.name));

  const items = catalog.map((a) => {
    const isMonthly = a.scope === AchievementScope.MONTHLY;
    const current = isMonthly
      ? a.requirementType === "BOTTLE_COUNT"
        ? monthly.bottles
        : monthly.points
      : a.requirementType === "BOTTLE_COUNT"
        ? student.bottlesRecycled
        : student.rewardPoints;

    return {
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      requirement: a.requirement,
      requirementType: a.requirementType,
      scope: a.scope,
      pointsBonus: a.pointsBonus,
      unlocked: unlockedNames.has(a.name),
      current,
      progress: Math.min((current / a.requirement) * 100, 100),
    };
  });

  return apiResponse({
    periodKey: monthKey,
    periodLabel: formatPeriodLabel(monthKey),
    lifetime: {
      bottles: student.bottlesRecycled,
      points: student.rewardPoints,
    },
    monthly: {
      bottles: monthly.bottles,
      points: monthly.points,
    },
    unlockedCount: unlocked.length,
    totalCount: catalog.length,
    achievements: items,
  });
}
