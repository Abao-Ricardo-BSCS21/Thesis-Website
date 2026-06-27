import { NextRequest } from "next/server";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { studentRegistrationSchema } from "@/validators/auth.validators";
import { studentAuthService, StudentAuthError } from "@/services/auth/student-auth.service";
import { OtpServiceError } from "@/services/otp/otp.service";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseBody(request);
  const parsed = studentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const result = await studentAuthService.register(parsed.data);
    return apiResponse(
      {
        studentId: result.studentId,
        message: result.message,
        maskedEmail: result.maskedEmail,
        expiresAt: result.expiresAt.toISOString(),
        resendAvailableAt: result.resendAvailableAt.toISOString(),
      },
      201
    );
  } catch (error) {
    if (error instanceof StudentAuthError) {
      return apiError(error.message, error.status);
    }
    if (error instanceof OtpServiceError) {
      return apiError(
        error.message || "Account created but OTP could not be sent. Use resend on the verify page.",
        error.status
      );
    }
    console.error("[register]", error);
    return apiError("Registration failed. Please try again.", 500);
  }
}
