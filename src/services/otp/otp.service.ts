import bcrypt from "bcryptjs";
import { OtpPurpose } from "@prisma/client";
import { OTP_CONFIG, type OtpPurposeType } from "@/lib/constants/otp";
import { generateOtpCode, maskPhoneNumber, normalizePhoneNumber } from "@/lib/utils/phone";
import { otpRepository, studentRepository } from "@/repositories/auth.repository";
import { webhookDispatcher } from "@/services/webhook/webhook-dispatcher.service";

export class OtpServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
    public meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = "OtpServiceError";
  }
}

export class OtpService {
  private otpRepo = otpRepository;
  private studentRepo = studentRepository;

  /** Generate, store, and send a new OTP */
  async createAndSendOtp(
    studentId: string,
    purpose: OtpPurposeType,
    options?: { skipRateLimit?: boolean }
  ): Promise<{ maskedPhone: string; expiresAt: Date; resendAvailableAt: Date }> {
    await this.otpRepo.deleteExpired();

    const student = await this.studentRepo.findByStudentId(studentId);
    if (!student) {
      throw new OtpServiceError("Student not found", "STUDENT_NOT_FOUND", 404);
    }

    const otpPurpose = purpose as OtpPurpose;

    if (!options?.skipRateLimit) {
      await this.enforceRateLimit(student.id);
      await this.enforceResendCooldown(student.id, otpPurpose);
    }

    const plainOtp = generateOtpCode(OTP_CONFIG.LENGTH);
    const otpHash = await bcrypt.hash(plainOtp, 10);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    await this.otpRepo.invalidatePending(student.id, otpPurpose);

    await this.otpRepo.create({
      studentId: student.id,
      phoneNumber: student.phoneNumber,
      otpHash,
      purpose: otpPurpose,
      expiresAt,
    });

    const message = `FilCycle: Your verification code is ${plainOtp}. Valid for 5 minutes. Do not share this code. Ref: ${student.studentId}`;

    const n8nPayload = {
      studentId: student.studentId,
      phoneNumber: student.phoneNumber,
      otp: plainOtp,
      purpose: otpPurpose,
      message,
      expiresAt: expiresAt.toISOString(),
      studentName: `${student.firstName} ${student.lastName}`,
      email: student.user?.email ?? null,
    };

    const n8nResult = await webhookDispatcher.deliverSms("OTP_SEND", n8nPayload);

    if (!n8nResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.log("\n--------------------------------");
        console.log(`[OTP DEV] n8n SMS failed — code for ${student.studentId}: ${plainOtp}`);
        console.log(`Phone: ${student.phoneNumber}`);
        console.log(`Error: ${n8nResult.error}`);
        console.log("--------------------------------\n");
      }

      throw new OtpServiceError(
        n8nResult.error || "Failed to send OTP via n8n",
        "SMS_FAILED",
        503
      );
    }

    webhookDispatcher.dispatchAsync("EMAIL", "OTP_SEND", {
      ...n8nPayload,
      subject: "FilCycle Verification Code",
      emailBody: message,
    });

    const resendAvailableAt = new Date(
      Date.now() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
    );

    return {
      maskedPhone: maskPhoneNumber(student.phoneNumber),
      expiresAt,
      resendAvailableAt,
    };
  }

  /** Verify OTP code */
  async verifyOtp(
    studentId: string,
    plainOtp: string,
    purpose: OtpPurposeType
  ): Promise<{ verified: boolean; studentDbId: string }> {
    const student = await this.studentRepo.findByStudentId(studentId);
    if (!student) {
      throw new OtpServiceError("Student not found", "STUDENT_NOT_FOUND", 404);
    }

    const otpPurpose = purpose as OtpPurpose;
    const record = await this.otpRepo.findLatestValid(student.id, otpPurpose);

    if (!record) {
      throw new OtpServiceError(
        "OTP expired or not found. Please request a new one.",
        "OTP_EXPIRED",
        400
      );
    }

    if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      await this.otpRepo.invalidatePending(student.id, otpPurpose);
      throw new OtpServiceError(
        "Too many failed attempts. A new OTP has been sent.",
        "MAX_ATTEMPTS",
        429
      );
    }

    const isValid = await bcrypt.compare(plainOtp, record.otpHash);

    if (!isValid) {
      const updated = await this.otpRepo.incrementAttempts(record.id);

      if (updated.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        await this.otpRepo.invalidatePending(student.id, otpPurpose);
        await this.createAndSendOtp(studentId, purpose, { skipRateLimit: true });
        throw new OtpServiceError(
          "Too many failed attempts. A new OTP has been sent.",
          "MAX_ATTEMPTS",
          429
        );
      }

      throw new OtpServiceError(
        `Invalid OTP. ${OTP_CONFIG.MAX_ATTEMPTS - updated.attempts} attempts remaining.`,
        "INVALID_OTP",
        400,
        { attemptsRemaining: OTP_CONFIG.MAX_ATTEMPTS - updated.attempts }
      );
    }

    await this.otpRepo.markVerified(record.id);

    if (
      purpose === "REGISTRATION" ||
      purpose === "PHONE_VERIFICATION"
    ) {
      await this.studentRepo.activatePhoneVerification(student.id);
    }

    return { verified: true, studentDbId: student.id };
  }

  /** Check if student has a recent verified OTP for sensitive action */
  async hasVerifiedAction(
    studentDbId: string,
    purpose: OtpPurposeType
  ): Promise<boolean> {
    const record = await this.otpRepo.findLatestVerifiedAction(
      studentDbId,
      purpose as OtpPurpose,
      OTP_CONFIG.ACTION_VERIFICATION_MINUTES
    );
    return !!record;
  }

  /** Resend OTP with cooldown enforcement */
  async resendOtp(studentId: string, purpose: OtpPurposeType) {
    return this.createAndSendOtp(studentId, purpose);
  }

  private async enforceRateLimit(studentDbId: string) {
    const count = await this.otpRepo.countRecentRequests(
      studentDbId,
      OTP_CONFIG.RATE_LIMIT_WINDOW_MINUTES
    );

    if (count >= OTP_CONFIG.RATE_LIMIT_MAX) {
      throw new OtpServiceError(
        "Too many OTP requests. Please try again in 15 minutes.",
        "RATE_LIMITED",
        429
      );
    }
  }

  private async enforceResendCooldown(studentDbId: string, purpose: OtpPurpose) {
    const lastCreated = await this.otpRepo.getLastCreatedAt(studentDbId, purpose);
    if (!lastCreated) return;

    const elapsed = (Date.now() - lastCreated.getTime()) / 1000;
    if (elapsed < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - elapsed);
      throw new OtpServiceError(
        `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        "RESEND_COOLDOWN",
        429,
        { waitSeconds }
      );
    }
  }
}

export const otpService = new OtpService();
