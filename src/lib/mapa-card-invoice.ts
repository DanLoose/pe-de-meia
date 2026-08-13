import {
  invoiceCycleForPurchase,
  type InvoiceCycle,
} from "@/lib/card-cycle";
import { formatDateOnly, getMonthDateRange, parseDateOnly } from "@/lib/dates";

export interface CardChargePoint {
  date: string;
  amount: number;
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
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

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function previousClosing(cycleEnd: Date, closingDay: number): Date {
  const year = cycleEnd.getUTCFullYear();
  const month = cycleEnd.getUTCMonth() + 1;
  const prev = addUtcMonths(year, month, -1);
  return utcDate(prev.year, prev.month, closingDay);
}

/**
 * Earliest purchase date needed so every open cycle in the month
 * already has the correct running total (cross-month persistence).
 */
export function mapaCardLookbackStart(
  year: number,
  month: number,
  closingDay: number,
  dueDay: number,
): string {
  const { start, end } = getMonthDateRange(year, month);
  const first = formatDateOnly(
    invoiceCycleForPurchase(start, closingDay, dueDay).cycleStart,
  );
  const last = formatDateOnly(
    invoiceCycleForPurchase(end, closingDay, dueDay).cycleStart,
  );
  return first <= last ? first : last;
}

/** Cycle whose due date falls on this calendar day (vencimento). */
export function invoiceCycleForDueDate(
  dueDateStr: string,
  closingDay: number,
  dueDay: number,
): InvoiceCycle | null {
  const dueDate = parseDateOnly(dueDateStr);
  const day = dueDate.getUTCDate();
  const lastDay = new Date(
    Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const effectiveDue = Math.min(dueDay, lastDay);
  if (day !== effectiveDue) return null;

  const y = dueDate.getUTCFullYear();
  const m = dueDate.getUTCMonth() + 1;

  let cycleEnd: Date;
  if (dueDay > closingDay) {
    cycleEnd = utcDate(y, m, Math.min(closingDay, lastDay));
  } else {
    const prev = addUtcMonths(y, m, -1);
    const prevLast = new Date(Date.UTC(prev.year, prev.month, 0)).getUTCDate();
    cycleEnd = utcDate(prev.year, prev.month, Math.min(closingDay, prevLast));
  }

  const cycleStart = addUtcDays(previousClosing(cycleEnd, closingDay), 1);
  return {
    cycleStart,
    cycleEnd,
    dueDate,
  };
}

function chargeBelongsToCycle(
  chargeDate: string,
  cycle: InvoiceCycle,
  closingDay: number,
  dueDay: number,
): boolean {
  if (chargeDate < formatDateOnly(cycle.cycleStart)) return false;
  if (chargeDate > formatDateOnly(cycle.cycleEnd)) return false;
  const chargeCycle = invoiceCycleForPurchase(
    parseDateOnly(chargeDate),
    closingDay,
    dueDay,
  );
  return formatDateOnly(chargeCycle.cycleEnd) === formatDateOnly(cycle.cycleEnd);
}

/** Sum of card purchases in a cycle with date ≤ asOfDate. */
export function invoiceTotalAsOf(
  charges: CardChargePoint[],
  cycle: InvoiceCycle,
  asOfDate: string,
  closingDay: number,
  dueDay: number,
): number {
  let sum = 0;
  for (const charge of charges) {
    if (charge.date > asOfDate) continue;
    if (!chargeBelongsToCycle(charge.date, cycle, closingDay, dueDay)) continue;
    sum += charge.amount;
  }
  return sum;
}

/**
 * For each day in the month: running total of the invoice cycle that a
 * purchase on that day would belong to (resets the day after fechamento).
 */
export function buildOpenInvoiceRunningByDate(
  dayDates: string[],
  charges: CardChargePoint[],
  closingDay: number,
  dueDay: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const date of dayDates) {
    const cycle = invoiceCycleForPurchase(
      parseDateOnly(date),
      closingDay,
      dueDay,
    );
    result.set(
      date,
      invoiceTotalAsOf(charges, cycle, date, closingDay, dueDay),
    );
  }
  return result;
}

/** Full closed invoice amount due on this vencimento day (0 if not a due day). */
export function closedInvoiceDueOnDate(
  date: string,
  charges: CardChargePoint[],
  closingDay: number,
  dueDay: number,
): number {
  const cycle = invoiceCycleForDueDate(date, closingDay, dueDay);
  if (!cycle) return 0;
  return invoiceTotalAsOf(
    charges,
    cycle,
    formatDateOnly(cycle.cycleEnd),
    closingDay,
    dueDay,
  );
}

export function isCardClosingDay(
  date: string,
  closingDay: number,
): boolean {
  const d = parseDateOnly(date);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return d.getUTCDate() === Math.min(closingDay, lastDay);
}
