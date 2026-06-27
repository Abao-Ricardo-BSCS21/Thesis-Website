import { NextRequest } from "next/server";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { otpResendSchema } from "@/validators/auth.validators";
import { otpService, OtpServiceError } from "@/services/otp/otp.service";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseBody(request);
  const parsed = otpResendSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const result = await otpService.resendOtp(parsed.data.studentId, parsed.data.purpose);
    return apiResponse({
      message: "A new OTP has been sent.",
      maskedPhone: result.maskedPhone,
      expiresAt: result.expiresAt.toISOString(),
      resendAvailableAt: result.resendAvailableAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof OtpServiceError) {
      return apiError(error.message, error.status);
    }
    console.error("[otp/resend]", error);
    return apiError("Failed to resend OTP. Please try again.", 500);
  }
}
