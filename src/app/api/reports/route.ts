import { NextRequest } from "next/server";
import { RoleName, TransactionType } from "@prisma/client";
import { apiError, apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { reportQuerySchema } from "@/lib/validations";
import { format } from "date-fns";

function getDateRange(period: string) {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case "daily":
      start.setDate(now.getDate() - 1);
      break;
    case "weekly":
      start.setDate(now.getDate() - 7);
      break;
    case "monthly":
      start.setMonth(now.getMonth() - 1);
      break;
    case "yearly":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return { start, end: now };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const parsed = reportQuerySchema.safeParse({
    period: searchParams.get("period") || "monthly",
    format: searchParams.get("format") || "json",
  });

  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const { period, format: exportFormat } = parsed.data;
  const { start, end } = getDateRange(period);

  const [transactions, redemptions, students, machines] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        student: { select: { studentId: true, firstName: true, lastName: true } },
      },
    }),
    prisma.rewardRedemption.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { reward: true, student: true },
    }),
    prisma.student.count(),
    prisma.machine.findMany(),
  ]);

  const bottleSubmissions = transactions.filter(
    (t) => t.type === TransactionType.BOTTLE_SUBMISSION
  );

  const report = {
    period,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      totalTransactions: transactions.length,
      bottlesRecycled: bottleSubmissions.reduce((s, t) => s + t.bottleCount, 0),
      pointsDistributed: bottleSubmissions.reduce((s, t) => s + t.pointsEarned, 0),
      plasticCollectedKg: bottleSubmissions.reduce((s, t) => s + (t.weightKg ?? 0), 0),
      rewardsRedeemed: redemptions.length,
      activeStudents: students,
      machinesOnline: machines.filter((m) => m.status === "ONLINE").length,
    },
    transactions: bottleSubmissions,
    redemptions,
  };

  if (exportFormat === "csv") {
    const csv = [
      "Date,Student ID,Student Name,Bottles,Points,Weight (kg)",
      ...bottleSubmissions.map(
        (t) =>
          `${format(t.createdAt, "yyyy-MM-dd HH:mm")},${t.student.studentId},"${t.student.firstName} ${t.student.lastName}",${t.bottleCount},${t.pointsEarned},${t.weightKg ?? 0}`
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="filcycle-report-${period}.csv"`,
      },
    });
  }

  if (exportFormat === "excel" || exportFormat === "pdf") {
    return apiResponse({
      ...report,
      message: `${exportFormat.toUpperCase()} export available client-side via download button`,
    });
  }

  return apiResponse(report);
}
