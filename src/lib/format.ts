/** Format a date for reports: "10 Mar 26" (day, short month, 2-digit year). */
export function formatReportDate(
  value: Date | string | number
): string {
  const d = typeof value === "object" && value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(d);
}
