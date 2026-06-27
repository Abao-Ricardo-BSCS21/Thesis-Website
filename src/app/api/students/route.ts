import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { studentCreateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
    RoleName.STUDENT,
  ]);
  if (error) return error;

  if (session!.user.role === RoleName.STUDENT) {
    const student = await prisma.student.findFirst({
      where: { userId: session!.user.id },
      include: {
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
        redemptions: {
          include: { reward: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    return apiResponse(student);
  }

  const students = await prisma.student.findMany({
    include: { user: { select: { email: true, isActive: true } } },
    orderBy: { bottlesRecycled: "desc" },
  });

  return apiResponse(students);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([
    RoleName.ADMINISTRATOR,
    RoleName.STAFF,
  ]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const existing = await prisma.student.findUnique({
    where: { studentId: parsed.data.studentId },
  });
  if (existing) return apiError("Student ID already exists");

  const studentRole = await prisma.role.findUnique({
    where: { name: RoleName.STUDENT },
  });
  if (!studentRole) return apiError("Student role not configured", 500);

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

  const student = await prisma.student.create({
    data: {
      studentId: parsed.data.studentId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      course: parsed.data.course,
      year: parsed.data.year,
      phoneNumber: `+6390000${parsed.data.studentId.replace(/\D/g, "").slice(-5)}`,
      phoneVerified: true,
      user: {
        create: {
          email: parsed.data.email,
          password: hashedPassword,
          roleId: studentRole.id,
        },
      },
    },
    include: { user: true },
  });

  return apiResponse(student, 201);
}
