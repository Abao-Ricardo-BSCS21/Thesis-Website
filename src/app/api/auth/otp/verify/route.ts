import { NextRequest } from "next/server";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { otpVerifySchema } from "@/validators/auth.validators";
import { otpService, OtpServiceError } from "@/services/otp/otp.service";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseBody(request);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const result = await otpService.verifyOtp(
      parsed.data.studentId,
      parsed.data.otp,
      parsed.data.purpose
    );
    return apiResponse({
      verified: result.verified,
      message: "Phone number verified successfully.",
    });
  } catch (error) {
    if (error instanceof OtpServiceError) {
      return apiError(error.message, error.status);
    }
    console.error("[otp/verify]", error);
    return apiError("Verification failed. Please try again.", 500);
  }
}
