import bcrypt from "bcryptjs";
import { RoleName } from "@prisma/client";
import prisma from "@/lib/prisma";
import { maskPhoneNumber, normalizePhoneNumber, parseFullName } from "@/lib/utils/phone";
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
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    const { firstName, lastName } = parseFullName(input.fullName);

    if (await this.studentRepo.existsByStudentId(input.studentId)) {
      throw new StudentAuthError("Student ID already registered", "DUPLICATE_STUDENT_ID", 409);
    }

    if (await this.studentRepo.existsByPhone(phoneNumber)) {
      throw new StudentAuthError("Phone number already registered", "DUPLICATE_PHONE", 409);
    }

    if (input.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (emailTaken) {
        throw new StudentAuthError("Email already in use", "DUPLICATE_EMAIL", 409);
      }
    }

    const studentRole = await prisma.role.findUnique({
      where: { name: RoleName.STUDENT },
    });
    if (!studentRole) {
      throw new StudentAuthError("System configuration error", "ROLE_MISSING", 500);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.studentRepo.createWithUser({
      studentId: input.studentId,
      firstName,
      lastName,
      course: input.course,
      year: input.year,
      phoneNumber,
      email: input.email || null,
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
      email: input.email || null,
      phoneNumber,
      course: input.course,
      year: input.year,
      subject: "Welcome to FilCycle",
      message: `Welcome ${firstName}! Your FilCycle account has been created. Please verify your phone number.`,
    });

    return {
      studentId: input.studentId,
      message: "Registration successful. Please verify your phone number.",
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

    if (!student.phoneVerified || !student.user.isActive) {
      const purpose = "PHONE_VERIFICATION" as const;
      let otpMeta: Awaited<ReturnType<typeof otpService.createAndSendOtp>> | null = null;

      try {
        otpMeta = await otpService.createAndSendOtp(student.studentId, purpose);
      } catch (error) {
        if (!(error instanceof OtpServiceError) || error.code !== "RESEND_COOLDOWN") {
          throw error;
        }
      }

      return {
        authenticated: false,
        requiresOtp: true,
        studentId: student.studentId,
        purpose,
        maskedPhone: otpMeta?.maskedPhone ?? maskPhoneNumber(student.phoneNumber),
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

  async requestActionOtp(studentDbId: string, purpose: "REWARD_REDEMPTION" | "CHANGE_PHONE" | "RESET_PASSWORD" | "NEW_DEVICE") {
    const student = await this.studentRepo.findById(studentDbId);
    if (!student) {
      throw new StudentAuthError("Student not found", "STUDENT_NOT_FOUND", 404);
    }

    if (!student.phoneVerified) {
      throw new StudentAuthError("Phone number not verified", "PHONE_NOT_VERIFIED", 403);
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
    purpose: "REWARD_REDEMPTION" | "CHANGE_PHONE" | "RESET_PASSWORD" | "NEW_DEVICE"
  ) {
    return otpService.verifyOtp(studentId, otp, purpose);
  }

  async hasActionVerification(
    studentDbId: string,
    purpose: "REWARD_REDEMPTION" | "CHANGE_PHONE" | "RESET_PASSWORD" | "NEW_DEVICE"
  ) {
    return otpService.hasVerifiedAction(studentDbId, purpose);
  }
}

export const studentAuthService = new StudentAuthService();
