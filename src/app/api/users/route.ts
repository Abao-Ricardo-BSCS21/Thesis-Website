import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { userCreateWithRoleSchema } from "@/lib/validations";
import { studentRepository } from "@/repositories/auth.repository";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: roleFilter
      ? { role: { name: roleFilter as RoleName } }
      : undefined,
    include: {
      role: { select: { name: true } },
      student: {
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          course: true,
          year: true,
          rewardPoints: true,
          bottlesRecycled: true,
          rank: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(users);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = userCreateWithRoleSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const data = parsed.data;
  const hashedPassword = await bcrypt.hash(data.password, 12);

  if (data.role === "STUDENT") {
    if (!data.email) {
      return apiError("Email is required for student accounts");
    }

    const existing = await prisma.student.findUnique({
      where: { studentId: data.studentId },
    });
    if (existing) return apiError("Student ID already exists");

    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) return apiError("Email already in use");

    const studentRole = await prisma.role.findUnique({
      where: { name: RoleName.STUDENT },
    });
    if (!studentRole) return apiError("Student role not configured", 500);

    const created = await studentRepository.createWithUser({
      studentId: data.studentId,
      firstName: data.firstName,
      lastName: data.lastName,
      course: data.course,
      year: data.year,
      email: data.email,
      passwordHash: hashedPassword,
      roleId: studentRole.id,
    });

    const student = await prisma.student.findUnique({
      where: { userId: created.id },
    });
    if (!student) {
      return apiError("Failed to create student profile", 500);
    }

    await studentRepository.activateEmailVerification(student.id);

    const user = await prisma.user.findUnique({
      where: { id: created.id },
      include: { role: true, student: true },
    });

    return apiResponse(user, 201);
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (emailTaken) return apiError("Email already in use");

  const role = await prisma.role.findUnique({
    where: { name: data.role as RoleName },
  });
  if (!role) return apiError("Role not found", 500);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      roleId: role.id,
    },
    include: { role: true, student: true },
  });

  return apiResponse(user, 201);
}
