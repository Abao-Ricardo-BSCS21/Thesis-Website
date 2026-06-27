import prisma from "@/lib/prisma";
import { OtpPurpose } from "@prisma/client";
import type { OtpPurposeType } from "@/lib/constants/otp";

export class OtpRepository {
  async invalidatePending(studentId: string, purpose: OtpPurpose) {
    await prisma.otpVerification.updateMany({
      where: { studentId, purpose, verified: false },
      data: { verified: true },
    });
  }

  async create(data: {
    studentId: string;
    email: string;
    otpHash: string;
    purpose: OtpPurpose;
    expiresAt: Date;
  }) {
    return prisma.otpVerification.create({ data });
  }

  async findLatestValid(studentId: string, purpose: OtpPurpose) {
    return prisma.otpVerification.findFirst({
      where: {
        studentId,
        purpose,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findLatestVerifiedAction(
    studentId: string,
    purpose: OtpPurpose,
    withinMinutes: number
  ) {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    return prisma.otpVerification.findFirst({
      where: {
        studentId,
        purpose,
        verified: true,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async incrementAttempts(id: string) {
    return prisma.otpVerification.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async markVerified(id: string) {
    return prisma.otpVerification.update({
      where: { id },
      data: { verified: true },
    });
  }

  async countRecentRequests(studentId: string, windowMinutes: number) {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    return prisma.otpVerification.count({
      where: { studentId, createdAt: { gte: since } },
    });
  }

  async getLastCreatedAt(studentId: string, purpose: OtpPurpose) {
    const record = await prisma.otpVerification.findFirst({
      where: { studentId, purpose },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return record?.createdAt ?? null;
  }

  /** Remove expired OTP records (housekeeping) */
  async deleteExpired() {
    return prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() }, verified: false },
          {
            verified: true,
            updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        ],
      },
    });
  }

  purposeFromType(type: OtpPurposeType): OtpPurpose {
    return type as OtpPurpose;
  }
}

export class StudentRepository {
  async findByStudentId(studentId: string) {
    return prisma.student.findUnique({
      where: { studentId },
      include: { user: { include: { role: true } } },
    });
  }

  async findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: { user: { include: { role: true } } },
    });
  }

  async createWithUser(data: {
    studentId: string;
    firstName: string;
    lastName: string;
    course: string;
    year: number;
    email: string;
    passwordHash: string;
    roleId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: data.passwordHash,
          roleId: data.roleId,
          isActive: false,
          student: {
            create: {
              studentId: data.studentId,
              firstName: data.firstName,
              lastName: data.lastName,
              course: data.course,
              year: data.year,
              emailVerified: false,
            },
          },
        },
        include: { student: true, role: true },
      });
      return user;
    });
  }

  async activateEmailVerification(studentId: string) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id: studentId },
        data: { emailVerified: true },
        include: { user: true },
      });
      await tx.user.update({
        where: { id: student.userId },
        data: { isActive: true },
      });
      return student;
    });
  }

  async existsByStudentId(studentId: string) {
    const count = await prisma.student.count({ where: { studentId } });
    return count > 0;
  }
}

export const otpRepository = new OtpRepository();
export const studentRepository = new StudentRepository();
