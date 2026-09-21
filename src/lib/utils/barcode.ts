import { randomBytes } from "crypto";
import { BARCODE_CONFIG } from "@/lib/constants/barcode";

/** Generate a unique FilCycle barcode payload (e.g. FC1A2B3C4D5E) */
export function generateBarcodeId(): string {
  const hex = randomBytes(Math.ceil(BARCODE_CONFIG.CODE_LENGTH / 2))
    .toString("hex")
    .toUpperCase()
    .slice(0, BARCODE_CONFIG.CODE_LENGTH);
  return `${BARCODE_CONFIG.PREFIX}${hex}`;
}

/** Normalize scanner / typed input (trim, uppercase, strip spaces) */
export function normalizeBarcodeInput(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidBarcodeFormat(value: string): boolean {
  const code = normalizeBarcodeInput(value);
  const pattern = new RegExp(
    `^${BARCODE_CONFIG.PREFIX}[A-F0-9]{${BARCODE_CONFIG.CODE_LENGTH}}$`
  );
  return pattern.test(code);
}
