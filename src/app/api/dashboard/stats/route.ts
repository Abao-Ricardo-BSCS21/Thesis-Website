import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import {
  getDashboardStats,
  getChartData,
} from "@/lib/services/recycling-service";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") as "daily" | "weekly" | "monthly") || "daily";

  try {
    const [stats, chartData] = await Promise.all([
      getDashboardStats(),
      getChartData(period),
    ]);

    return apiResponse({ ...stats, chartData });
  } catch {
    return apiError("Failed to fetch dashboard statistics", 500);
  }
}
