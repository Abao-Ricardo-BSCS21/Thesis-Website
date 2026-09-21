/** Barcode / machine scan session configuration */
export const BARCODE_CONFIG = {
  /** Prefix so FilCycle codes are distinct from other campus barcodes */
  PREFIX: "FC",
  /** Random hex chars after prefix (total payload e.g. FC + 10 hex) */
  CODE_LENGTH: 10,
  /** How long a scan unlocks recycling at the machine */
  SESSION_MINUTES: 5,
  /** Code 128 is widely supported by USB HID scanners */
  FORMAT: "CODE128" as const,
} as const;
