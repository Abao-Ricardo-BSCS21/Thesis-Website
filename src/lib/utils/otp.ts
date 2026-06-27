export function generateOtpCode(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export function maskEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 1) return "****@****";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const maskedLocal =
    local.length <= 2
      ? `${local[0]}*`
      : `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}`;
  const dot = domain.indexOf(".");
  const maskedDomain =
    dot > 0
      ? `${domain[0]}***${domain.slice(dot)}`
      : `${domain[0]}***`;
  return `${maskedLocal}@${maskedDomain}`;
}
