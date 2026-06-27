import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { otpActionRequestSchema } from "@/validators/auth.validators";
import { studentAuthService, StudentAuthError } from "@/services/auth/student-auth.service";
import { OtpServiceError } from "@/services/otp/otp.service";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.STUDENT]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = otpActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  const student = await prisma.student.findFirst({
    where: { userId: session!.user.id },
  });
  if (!student) return apiError("Student not found", 404);

  try {
    const result = await studentAuthService.requestActionOtp(student.id, parsed.data.purpose);
    return apiResponse({
      message: "OTP sent for verification.",
      maskedEmail: result.maskedEmail,
      expiresAt: result.expiresAt.toISOString(),
      resendAvailableAt: result.resendAvailableAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof StudentAuthError || error instanceof OtpServiceError) {
      return apiError(error.message, error.status);
    }
    console.error("[otp/request-action]", error);
    return apiError("Failed to send OTP.", 500);
  }
}
