import bcrypt from "bcryptjs";
import { RoleName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseFullName } from "@/lib/utils/name";
import { studentRepository } from "@/repositories/auth.repository";
import { otpService, OtpServiceError } from "@/services/otp/otp.service";
import { webhookDispatcher } from "@/services/webhook/webhook-dispatcher.service";
import type { StudentRegistrationInput } from "@/validators/auth.validators";

export class StudentAuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400
  ) {
    super(message);
    this.name = "StudentAuthError";
  }
}

export class StudentAuthService {
  private studentRepo = studentRepository;

  async register(input: StudentRegistrationInput) {
    const email = input.email.trim().toLowerCase();
    const { firstName, lastName } = parseFullName(input.fullName);

    if (await this.studentRepo.existsByStudentId(input.studentId)) {
      throw new StudentAuthError("Student ID already registered", "DUPLICATE_STUDENT_ID", 409);
    }

    const emailTaken = await prisma.user.findUnique({
      where: { email },
    });
    if (emailTaken) {
      throw new StudentAuthError("Email already in use", "DUPLICATE_EMAIL", 409);
    }

    const studentRole = await prisma.role.findUnique({
      where: { name: RoleName.STUDENT },
    });
    if (!studentRole) {
      throw new StudentAuthError("System configuration error", "ROLE_MISSING", 500);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await this.studentRepo.createWithUser({
      studentId: input.studentId,
      firstName,
      lastName,
      course: input.course,
      year: input.year,
      email,
      passwordHash,
      roleId: studentRole.id,
    });

    const otpResult = await otpService.createAndSendOtp(
      input.studentId,
      "REGISTRATION",
      { skipRateLimit: true }
    );

    webhookDispatcher.dispatchAsync("EMAIL", "STUDENT_REGISTER", {
      studentId: input.studentId,
      firstName,
      lastName,
      email,
      course: input.course,
      year: input.year,
      subject: "Welcome to FilCycle",
      message: `Welcome ${firstName}! Your FilCycle account has been created. Please verify your email address.`,
    });

    return {
      studentId: input.studentId,
      message: "Registration successful. Please verify your email.",
      ...otpResult,
    };
  }

  async loginCheck(studentId: string, password: string) {
    const student = await this.studentRepo.findByStudentId(studentId);

    if (!student || !student.user) {
      throw new StudentAuthError(
        "Invalid Student ID or Password.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    const isValid = await bcrypt.compare(password, student.user.password);

    if (!isValid) {
      throw new StudentAuthError(
        "Invalid Student ID or Password.",
        "INVALID_CREDENTIALS",
        401
      );
    }

    if (!student.emailVerified || !student.user.isActive) {
      const purpose = "EMAIL_VERIFICATION" as const;
      let otpMeta: Awaited<ReturnType<typeof otpService.createAndSendOtp>> | null = null;

      try {
        otpMeta = await otpService.createAndSendOtp(student.studentId, purpose);
      } catch (error) {
        if (!(error instanceof OtpServiceError) || error.code !== "RESEND_COOLDOWN") {
          throw error;
        }
      }

      const email = student.user.email ?? "";

      return {
        authenticated: false,
        requiresOtp: true,
        studentId: student.studentId,
        purpose,
        maskedEmail: otpMeta?.maskedEmail ?? (email ? `${email[0]}***@${email.split("@")[1] ?? "****"}` : ""),
        expiresAt: otpMeta?.expiresAt.toISOString(),
        resendAvailableAt: otpMeta?.resendAvailableAt.toISOString(),
      };
    }

    return {
      authenticated: true,
      requiresOtp: false,
      studentId: student.studentId,
    };
  }

  async requestActionOtp(
    studentDbId: string,
    purpose: "REWARD_REDEMPTION" | "RESET_PASSWORD" | "NEW_DEVICE"
  ) {
    const student = await this.studentRepo.findById(studentDbId);
    if (!student) {
      throw new StudentAuthError("Student not found", "STUDENT_NOT_FOUND", 404);
    }

    if (!student.emailVerified) {
      throw new StudentAuthError("Email not verified", "EMAIL_NOT_VERIFIED", 403);
    }

    try {
      return await otpService.createAndSendOtp(student.studentId, purpose);
    } catch (error) {
      if (error instanceof OtpServiceError) throw error;
      throw new StudentAuthError("Failed to send OTP", "OTP_FAILED", 500);
    }
  }

  async verifyActionOtp(
    studentId: string,
    otp: string,
    purpose: "REWARD_REDEMPTION" | "RESET_PASSWORD" | "NEW_DEVICE"
  ) {
    return otpService.verifyOtp(studentId, otp, purpose);
  }

  async hasActionVerification(
    studentDbId: string,
    purpose: "REWARD_REDEMPTION" | "RESET_PASSWORD" | "NEW_DEVICE"
  ) {
    return otpService.hasVerifiedAction(studentDbId, purpose);
  }
}

export const studentAuthService = new StudentAuthService();
