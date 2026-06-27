import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { studentUpdateSchema, userUpdateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { name: true } },
      student: true,
    },
  });

  if (!user) return apiError("User not found", 404);
  return apiResponse(user);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;
  const body = await parseBody(request);

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: true, student: true },
  });

  if (!existing) return apiError("User not found", 404);

  if (existing.role.name === RoleName.STUDENT) {
    const parsed = studentUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    const data = parsed.data;

    if (data.studentId && data.studentId !== existing.student?.studentId) {
      const duplicate = await prisma.student.findUnique({
        where: { studentId: data.studentId },
      });
      if (duplicate) return apiError("Student ID already exists");
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailTaken) return apiError("Email already in use");
    }

    const userUpdate: Record<string, unknown> = {};
    if (data.email !== undefined) userUpdate.email = data.email || null;
    if (data.isActive !== undefined) userUpdate.isActive = data.isActive;
    if (data.password) userUpdate.password = await bcrypt.hash(data.password, 12);

    const studentUpdate: Record<string, unknown> = {};
    if (data.studentId) studentUpdate.studentId = data.studentId;
    if (data.firstName) studentUpdate.firstName = data.firstName;
    if (data.lastName) studentUpdate.lastName = data.lastName;
    if (data.course) studentUpdate.course = data.course;
    if (data.year) studentUpdate.year = data.year;
    if (data.rewardPoints !== undefined) studentUpdate.rewardPoints = data.rewardPoints;
    if (data.bottlesRecycled !== undefined) {
      studentUpdate.bottlesRecycled = data.bottlesRecycled;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...userUpdate,
        ...(Object.keys(studentUpdate).length > 0 && existing.student
          ? { student: { update: studentUpdate } }
          : {}),
      },
      include: { role: true, student: true },
    });

    return apiResponse(user);
  }

  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const data = parsed.data;

  if (data.email && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) return apiError("Email already in use");
  }

  if (data.role === RoleName.STAFF && existing.role.name === RoleName.ADMINISTRATOR) {
    const adminCount = await prisma.user.count({
      where: { role: { name: RoleName.ADMINISTRATOR }, isActive: true },
    });
    if (adminCount <= 1) {
      return apiError("Cannot demote the last active administrator");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.email) updateData.email = data.email;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 12);
  if (data.role) {
    const role = await prisma.role.findUnique({
      where: { name: data.role as RoleName },
    });
    if (!role) return apiError("Role not found");
    updateData.roleId = role.id;
  }

  if (id === session!.user.id && data.isActive === false) {
    return apiError("You cannot deactivate your own account");
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { role: true, student: true },
  });

  return apiResponse(user);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.ADMINISTRATOR]);
  if (error) return error;

  const { id } = await params;

  if (id === session!.user.id) {
    return apiError("You cannot delete your own account");
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });

  if (!existing) return apiError("User not found", 404);

  if (existing.role.name === RoleName.ADMINISTRATOR) {
    const adminCount = await prisma.user.count({
      where: { role: { name: RoleName.ADMINISTRATOR } },
    });
    if (adminCount <= 1) {
      return apiError("Cannot delete the last administrator account");
    }
  }

  await prisma.user.delete({ where: { id } });

  return apiResponse({ deleted: true });
}
