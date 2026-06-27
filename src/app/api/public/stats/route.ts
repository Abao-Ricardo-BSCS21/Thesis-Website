import { NextRequest } from "next/server";
import { apiResponse, rateLimit } from "@/lib/api-utils";
import prisma from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const [
    totalBottles,
    totalStudents,
    totalPoints,
    totalWeight,
  ] = await Promise.all([
    prisma.student.aggregate({ _sum: { bottlesRecycled: true } }),
    prisma.student.count(),
    prisma.student.aggregate({ _sum: { rewardPoints: true } }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.BOTTLE_SUBMISSION },
      _sum: { weightKg: true },
    }),
  ]);

  return apiResponse({
    totalBottles: totalBottles._sum.bottlesRecycled ?? 0,
    totalStudents,
    totalPoints: totalPoints._sum.rewardPoints ?? 0,
    plasticSavedKg: Math.round((totalWeight._sum.weightKg ?? 0) * 100) / 100,
    machinesDeployed: await prisma.machine.count(),
  });
}
