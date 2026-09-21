import { AchievementScope } from "@prisma/client";

/** Calendar month key used for monthly achievement unlocks (e.g. 2026-07). */
export function getCurrentPeriodKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getLifetimePeriodKey(): string {
  return "lifetime";
}

export function periodKeyForScope(
  scope: AchievementScope,
  date = new Date()
): string {
  return scope === AchievementScope.MONTHLY
    ? getCurrentPeriodKey(date)
    : getLifetimePeriodKey();
}

/** Start of the current calendar month (local time). */
export function getMonthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** Human label for UI, e.g. "July 2026". */
export function formatPeriodLabel(periodKey: string): string {
  if (periodKey === "lifetime") return "Lifetime";
  const [y, m] = periodKey.split("-").map(Number);
  if (!y || !m) return periodKey;
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}
