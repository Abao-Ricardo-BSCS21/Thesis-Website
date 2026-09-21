import { NextRequest } from "next/server";
import { RoleName } from "@prisma/client";
import { apiError, apiResponse, parseBody, rateLimit } from "@/lib/api-utils";
import { requireAuth } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { barcodeRegenerateSchema } from "@/lib/validations";
import {
  ensureStudentBarcode,
  regenerateStudentBarcode,
} from "@/lib/services/barcode-service";
import { BARCODE_CONFIG } from "@/lib/constants/barcode";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.STUDENT]);
  if (error) return error;

  const student = await prisma.student.findFirst({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!student) return apiError("Student profile not found", 404);

  try {
    const withBarcode = await ensureStudentBarcode(student.id);
    if (!withBarcode?.barcodeId) {
      return apiError("Could not issue barcode", 500);
    }

    return apiResponse({
      barcodeId: withBarcode.barcodeId,
      studentId: withBarcode.studentId,
      firstName: withBarcode.firstName,
      lastName: withBarcode.lastName,
      course: withBarcode.course,
      year: withBarcode.year,
      format: BARCODE_CONFIG.FORMAT,
      sessionMinutes: BARCODE_CONFIG.SESSION_MINUTES,
    });
  } catch {
    return apiError("Failed to load barcode", 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { error, session } = await requireAuth([RoleName.STUDENT]);
  if (error) return error;

  const body = await parseBody(request);
  const parsed = barcodeRegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Confirm regeneration to continue");
  }

  const student = await prisma.student.findFirst({
    where: { userId: session!.user.id },
    select: { id: true },
  });

  if (!student) return apiError("Student profile not found", 404);

  try {
    const updated = await regenerateStudentBarcode(student.id);
    return apiResponse({
      barcodeId: updated.barcodeId,
      studentId: updated.studentId,
      firstName: updated.firstName,
      lastName: updated.lastName,
      course: updated.course,
      year: updated.year,
      format: BARCODE_CONFIG.FORMAT,
      sessionMinutes: BARCODE_CONFIG.SESSION_MINUTES,
    });
  } catch {
    return apiError("Failed to regenerate barcode", 500);
  }
}
