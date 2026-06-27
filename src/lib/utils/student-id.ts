/** Student ID format: YYYY-XXXXX (e.g. 2021-10001) */
export const STUDENT_ID_YEAR_LENGTH = 4;
export const STUDENT_ID_SEQUENCE_LENGTH = 5;
export const STUDENT_ID_MAX_LENGTH =
  STUDENT_ID_YEAR_LENGTH + 1 + STUDENT_ID_SEQUENCE_LENGTH;

export const STUDENT_ID_PATTERN = /^[0-9]{4}-[0-9]{5}$/;

/** Format student ID as YYYY-XXXXX while the user types */
export function formatStudentIdInput(value: string): string {
  const maxDigits = STUDENT_ID_YEAR_LENGTH + STUDENT_ID_SEQUENCE_LENGTH;
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);

  if (digits.length <= STUDENT_ID_YEAR_LENGTH) return digits;
  return `${digits.slice(0, STUDENT_ID_YEAR_LENGTH)}-${digits.slice(
    STUDENT_ID_YEAR_LENGTH,
    maxDigits
  )}`;
}

/** Strip and re-apply formatting before submit */
export function normalizeStudentId(value: string): string {
  return formatStudentIdInput(value.trim());
}

export function isCompleteStudentId(value: string): boolean {
  return STUDENT_ID_PATTERN.test(normalizeStudentId(value));
}
