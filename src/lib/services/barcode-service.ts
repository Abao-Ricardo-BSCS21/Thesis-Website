import prisma from "@/lib/prisma";
import { generateBarcodeId, normalizeBarcodeInput } from "@/lib/utils/barcode";
import {
  isCompleteStudentId,
  normalizeStudentId,
} from "@/lib/utils/student-id";

const studentSelect = {
  id: true,
  studentId: true,
  firstName: true,
  lastName: true,
  course: true,
  year: true,
  barcodeId: true,
  rewardPoints: true,
  bottlesRecycled: true,
} as const;

const MAX_GENERATE_ATTEMPTS = 8;

/** Ensure the student has a barcodeId; create one if missing. */
export async function ensureStudentBarcode(studentDbId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentDbId },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      course: true,
      year: true,
      barcodeId: true,
    },
  });

  if (!student) return null;

  if (student.barcodeId) {
    return student;
  }

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const barcodeId = generateBarcodeId();
    try {
      return await prisma.student.update({
        where: { id: studentDbId },
        data: { barcodeId },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          course: true,
          year: true,
          barcodeId: true,
        },
      });
    } catch {
      // Unique collision — try again
    }
  }

  throw new Error("Failed to allocate a unique barcode");
}

/** Resolve a scanned/typed code to an active student (barcode ID or student ID). */
export async function findStudentByBarcode(rawCode: string) {
  const code = normalizeBarcodeInput(rawCode);
  if (!code) return null;

  const byBarcode = await prisma.student.findFirst({
    where: {
      barcodeId: code,
      user: { isActive: true },
    },
    select: studentSelect,
  });

  if (byBarcode) return byBarcode;

  const studentId = normalizeStudentId(rawCode);
  if (!isCompleteStudentId(studentId)) return null;

  return prisma.student.findFirst({
    where: {
      studentId,
      user: { isActive: true },
    },
    select: studentSelect,
  });
}

/** Issue a new barcode (invalidates the previous sticker). */
export async function regenerateStudentBarcode(studentDbId: string) {
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const barcodeId = generateBarcodeId();
    try {
      return await prisma.student.update({
        where: { id: studentDbId },
        data: { barcodeId },
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          course: true,
          year: true,
          barcodeId: true,
        },
      });
    } catch {
      // Unique collision — try again
    }
  }

  throw new Error("Failed to allocate a unique barcode");
}
