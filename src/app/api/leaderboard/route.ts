import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { getLeaderboard } from "@/lib/services/recycling-service";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const period =
    (searchParams.get("period") as "weekly" | "monthly" | "allTime") || "allTime";

  try {
    const leaderboard = await getLeaderboard(period);
    return apiResponse(leaderboard);
  } catch {
    return apiError("Failed to fetch leaderboard", 500);
  }
}
