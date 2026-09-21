import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import { barcodeLookupSchema } from "@/lib/validations";
import { findStudentByBarcode } from "@/lib/services/barcode-service";
import { BARCODE_CONFIG } from "@/lib/constants/barcode";
import { normalizeBarcodeInput } from "@/lib/utils/barcode";
import prisma from "@/lib/prisma";

/**
 * Resolve a scanned/typed FilCycle barcode to a student.
 * Used by the recycle kiosk UI (manual entry today; USB HID scanner later).
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([
    RoleName.STUDENT,
    RoleName.STAFF,
    RoleName.ADMINISTRATOR,
  ]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = barcodeLookupSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const code = normalizeBarcodeInput(parsed.data.code);
  const student = await findStudentByBarcode(code);

  if (!student) {
    return apiError(
      "Barcode not recognized. Check your sticker or reprint it.",
      404
    );
  }

  // While recycling is behind student web login, only allow your own sticker.
  if (session!.user.role === RoleName.STUDENT) {
    const me = await prisma.student.findFirst({
      where: { userId: session!.user.id },
      select: { id: true },
    });
    if (!me || me.id !== student.id) {
      return apiError(
        "This barcode belongs to another student. Scan your own sticker.",
        403
      );
    }
  }

  return apiResponse({
    student: {
      id: student.id,
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      course: student.course,
      year: student.year,
      rewardPoints: student.rewardPoints,
      bottlesRecycled: student.bottlesRecycled,
      barcodeId: student.barcodeId,
    },
    sessionMinutes: BARCODE_CONFIG.SESSION_MINUTES,
  });
}
