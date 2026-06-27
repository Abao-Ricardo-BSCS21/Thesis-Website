/** Normalize Philippine phone numbers to +63XXXXXXXXXX format */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");

  if (cleaned.startsWith("+63")) return cleaned;
  if (cleaned.startsWith("63") && cleaned.length === 12) return `+${cleaned}`;
  if (cleaned.startsWith("09") && cleaned.length === 11) {
    return `+63${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("9") && cleaned.length === 10) {
    return `+63${cleaned}`;
  }

  return cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^\+639\d{9}$/.test(normalized);
}

export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length < 8) return "****";
  return `${normalized.slice(0, 4)}****${normalized.slice(-3)}`;
}

/** Semaphore expects 09XXXXXXXXX, 639XXXXXXXXX, or 9XXXXXXXXX (no + prefix) */
export function formatPhoneForSemaphore(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.startsWith("+63")) {
    return `0${normalized.slice(3)}`;
  }
  if (normalized.startsWith("63") && normalized.length === 12) {
    return `0${normalized.slice(2)}`;
  }
  return phone.replace(/[\s\-().+]/g, "");
}

export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function generateOtpCode(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}
