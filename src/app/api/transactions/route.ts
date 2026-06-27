import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const studentId = searchParams.get("studentId");

  const where: Record<string, unknown> = {};

  if (session!.user.role === RoleName.STUDENT) {
    const student = await prisma.student.findFirst({
      where: { userId: session!.user.id },
    });
    if (student) where.studentId = student.id;
  } else if (studentId) {
    where.studentId = studentId;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: { firstName: true, lastName: true, studentId: true },
      },
      bottle: true,
      machine: { select: { name: true, location: true } },
    },
  });

  return apiResponse(transactions);
}
