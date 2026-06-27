import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.STAFF, RoleName.ADMINISTRATOR]);
  if (error) return error;

  const redemptions = await prisma.rewardRedemption.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      student: { select: { firstName: true, lastName: true, studentId: true } },
      reward: { select: { name: true } },
    },
  });

  return apiResponse(redemptions);
}
