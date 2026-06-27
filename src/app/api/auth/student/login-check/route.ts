import { NextRequest } from "next/server";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { studentLoginCheckSchema } from "@/validators/auth.validators";
import { studentAuthService, StudentAuthError } from "@/services/auth/student-auth.service";
import { OtpServiceError } from "@/services/otp/otp.service";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const body = await parseBody(request);
  const parsed = studentLoginCheckSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400);
  }

  try {
    const result = await studentAuthService.loginCheck(
      parsed.data.studentId,
      parsed.data.password
    );
    return apiResponse(result);
  } catch (error) {
    if (error instanceof StudentAuthError) {
      return apiError(error.message, error.status);
    }
    if (error instanceof OtpServiceError) {
      return apiError(error.message, error.status);
    }
    console.error("[login-check]", error);
    return apiError("Login check failed. Please try again.", 500);
  }
}
