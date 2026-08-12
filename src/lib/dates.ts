export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonthDateRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

export function utcToday(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** First occurrence on or after today for a recurring rule's day-of-month. */
export function defaultRecurringStartsOn(
  dayOfMonth: number,
  reference: Date = utcToday(),
): Date {
  let year = reference.getUTCFullYear();
  let month = reference.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay);
  let candidate = new Date(Date.UTC(year, month, day));

  if (candidate < reference) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const nextLastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    candidate = new Date(
      Date.UTC(year, month, Math.min(dayOfMonth, nextLastDay)),
    );
  }

  return candidate;
}
