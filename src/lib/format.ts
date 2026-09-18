import {
  format,
  formatDistanceToNow,
  isThisMonth,
  isToday,
  isValid,
  parseISO,
} from "date-fns";

function toDate(value?: string | number | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function formatDate(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy") : "—";
}

export function formatDateTime(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy, h:mm a") : "—";
}

export function formatTime(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? format(d, "h:mm a") : "—";
}

export function formatDayHeading(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "No date";
  if (isToday(d)) return "Today";
  return format(d, "EEEE, d MMM");
}

export function relativeTime(value?: string | Date | null): string {
  const d = toDate(value);
  if (!d) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function dayKey(value?: string | Date | null): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd") : "none";
}

export function isDateToday(value?: string | Date | null): boolean {
  const d = toDate(value);
  return d ? isToday(d) : false;
}

export function isDateThisMonth(value?: string | Date | null): boolean {
  const d = toDate(value);
  return d ? isThisMonth(d) : false;
}

export function isPast(value?: string | Date | null): boolean {
  const d = toDate(value);
  return d ? d.getTime() < Date.now() : false;
}

export { toDate };
