/** Format a date for reports: "10 Mar 26" (day, short month, 2-digit year). */
export function formatReportDate(
  value: Date | string | number
): string {
  const d = typeof value === "object" && value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).format(d);
}

/** Format month key "YYYY-MM" as "March 2026". */
export function formatMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey.length < 7) return monthKey;
  const d = new Date(monthKey + "-01");
  if (Number.isNaN(d.getTime())) return monthKey;
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Readable statement title from label and optional date range. */
export function formatStatementTitle(
  originalLabel: string,
  dateRange?: { min: string; max: string } | null
): string {
  if (dateRange?.min && dateRange?.max) {
    const minD = new Date(dateRange.min);
    const maxD = new Date(dateRange.max);
    if (!Number.isNaN(minD.getTime()) && !Number.isNaN(maxD.getTime())) {
      const shortFmt = new Intl.DateTimeFormat("en-GB", {
        month: "short",
        year: "numeric",
      });
      const longFmt = new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      });
      const minStr = shortFmt.format(minD);
      const maxStr = shortFmt.format(maxD);
      if (minStr === maxStr) return `${longFmt.format(minD)} Statement`;
      return `${minStr}–${maxStr} Statement`;
    }
  }
  const cleaned = originalLabel
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
  return cleaned || "Statement";
}
