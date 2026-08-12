/**
 * Credit-card billing cycle.
 *
 * A purchase on date D belongs to the invoice whose cycle ends on the first
 * closing day on or after D.
 *
 * Due date is `dueDay` in the closing month when dueDay > closingDay;
 * otherwise it falls in the following month (e.g. close 25, due 10).
 *
 * Days are constrained to 1–28 so month length does not matter.
 */

export const DEFAULT_CARD_CLOSING_DAY = 1;
export const DEFAULT_CARD_DUE_DAY = 10;
export const CARD_DAY_MIN = 1;
export const CARD_DAY_MAX = 28;

export interface InvoiceCycle {
  cycleStart: Date;
  cycleEnd: Date;
  dueDate: Date;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(index / 12),
    month: (index % 12) + 1,
  };
}

function nextClosingOnOrAfter(date: Date, closingDay: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (day <= closingDay) {
    return utcDate(year, month, closingDay);
  }

  const next = addUtcMonths(year, month, 1);
  return utcDate(next.year, next.month, closingDay);
}

function previousClosing(cycleEnd: Date, closingDay: number): Date {
  const year = cycleEnd.getUTCFullYear();
  const month = cycleEnd.getUTCMonth() + 1;
  const prev = addUtcMonths(year, month, -1);
  return utcDate(prev.year, prev.month, closingDay);
}

function dueDateForClosing(
  cycleEnd: Date,
  closingDay: number,
  dueDay: number,
): Date {
  const year = cycleEnd.getUTCFullYear();
  const month = cycleEnd.getUTCMonth() + 1;

  if (dueDay > closingDay) {
    return utcDate(year, month, dueDay);
  }

  const next = addUtcMonths(year, month, 1);
  return utcDate(next.year, next.month, dueDay);
}

export function invoiceCycleForPurchase(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
): InvoiceCycle {
  const cycleEnd = nextClosingOnOrAfter(purchaseDate, closingDay);
  const cycleStart = addUtcDays(previousClosing(cycleEnd, closingDay), 1);
  const dueDate = dueDateForClosing(cycleEnd, closingDay, dueDay);
  return { cycleStart, cycleEnd, dueDate };
}

export function nextCycleStart(cycleEnd: Date): Date {
  return addUtcDays(cycleEnd, 1);
}

export function installmentPurchaseDates(
  firstPurchase: Date,
  closingDay: number,
  dueDay: number,
  count: number,
): Date[] {
  const dates: Date[] = [firstPurchase];
  let date = firstPurchase;
  for (let i = 1; i < count; i++) {
    const cycle = invoiceCycleForPurchase(date, closingDay, dueDay);
    date = nextCycleStart(cycle.cycleEnd);
    dates.push(date);
  }
  return dates;
}

export function cardPaymentDescription(dueDate: Date): string {
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(dueDate)
    .replace(".", "");
  return `Fatura ${month}/${dueDate.getUTCFullYear()}`;
}
