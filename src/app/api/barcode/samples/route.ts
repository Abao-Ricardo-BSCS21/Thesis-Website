import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";

/** Sample registered barcodes for staff/admin to use on the test page. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.STAFF,
    RoleName.ADMINISTRATOR,
  ]);
  if (error) return error;

  const students = await prisma.student.findMany({
    where: {
      barcodeId: { not: null },
      user: { isActive: true },
    },
    select: {
      studentId: true,
      firstName: true,
      lastName: true,
      barcodeId: true,
      course: true,
    },
    orderBy: { studentId: "asc" },
    take: 20,
  });

  return apiResponse(students);
}
