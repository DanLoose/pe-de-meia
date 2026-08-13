import { balanceBand, type BalanceBand } from "@/lib/balance-insights";
import {
  buildOpenInvoiceRunningByDate,
  closedInvoiceDueOnDate,
  invoiceCycleForDueDate,
  isCardClosingDay,
  type CardChargePoint,
} from "@/lib/mapa-card-invoice";
import {
  projectedRecurringNetForDate,
  recurringMovementForDate,
  type HorizonRuleInput,
} from "@/lib/horizon-recurring";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import type {
  MapaDayFlags,
  MapaDaySnapshot,
  MapaInvoiceStory,
  MapaNextCrunch,
} from "@/types";

/** Visual phase of the card cycle on a calendar day (ribbon above the grid). */
export type CycleRibbonPhase = "open" | "close" | "closed" | "pay";

export interface CycleRibbonSegment {
  phase: CycleRibbonPhase;
  /** Inclusive calendar day (1-based). */
  startDay: number;
  /** Inclusive calendar day (1-based). */
  endDay: number;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDayDates(year: number, month: number): string[] {
  const count = daysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= count; day++) {
    dates.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return dates;
}

/**
 * Project end-of-day balances from `today` through `endDate`.
 * `today` is seeded with `todayBalance` (flows already reflected).
 * Later days add recurrings + one-off cash deltas — no variable-estimate burn.
 */
export function projectBalanceRange(input: {
  today: string;
  todayBalance: number;
  endDate: string;
  rules: HorizonRuleInput[];
  cashDeltaByDate: Map<string, number>;
}): Map<string, number> {
  const balanceByDate = new Map<string, number>();
  let cursor = input.today;
  let running = input.todayBalance;

  while (cursor <= input.endDate) {
    if (cursor > input.today) {
      running += projectedRecurringNetForDate(input.rules, cursor);
      running += input.cashDeltaByDate.get(cursor) ?? 0;
    }
    balanceByDate.set(cursor, Math.round(running * 100) / 100);
    cursor = addDays(cursor, 1);
  }

  return balanceByDate;
}

export interface MapaCashCause {
  label: string;
  cashDelta: number;
}

/** Largest cash debit (most negative delta) — used for “próximo aperto”. */
export function largestCashDebitCause(
  causes: MapaCashCause[],
): MapaCashCause | null {
  let best: MapaCashCause | null = null;
  for (const cause of causes) {
    if (cause.cashDelta >= 0) continue;
    if (!best || cause.cashDelta < best.cashDelta) {
      best = cause;
    }
  }
  return best;
}

export function findNextCrunch(input: {
  today: string;
  days: Array<Pick<MapaDaySnapshot, "date" | "balance">>;
  causesByDate: Map<string, MapaCashCause[]>;
  lowThreshold: number;
}): MapaNextCrunch | null {
  for (const day of input.days) {
    if (day.date < input.today) continue;
    const isCrunch =
      day.balance < 0 || day.balance <= input.lowThreshold;
    if (!isCrunch) continue;

    const causes = input.causesByDate.get(day.date) ?? [];
    const debit = largestCashDebitCause(causes);
    return {
      date: day.date,
      balance: day.balance,
      causeLabel: debit?.label ?? "Movimento no caixa",
      causeAmount: debit ? Math.abs(debit.cashDelta) : 0,
    };
  }
  return null;
}

/**
 * Open-invoice footer on the grid: only on closing or card-purchase days.
 * Never on due day alone — payment is already the cash story.
 */
export function shouldShowOpenInvoiceFooter(input: {
  openInvoice: number;
  cardChargesToday: number;
  isClosing: boolean;
}): boolean {
  return (
    input.openInvoice > 0 &&
    (input.cardChargesToday > 0 || input.isClosing)
  );
}

export function isCardDueDay(
  date: string,
  closingDay: number,
  dueDay: number,
): boolean {
  return invoiceCycleForDueDate(date, closingDay, dueDay) !== null;
}

/** Largest cash income recurring — its occurrence dates are “payday”. */
export function primaryPaydayDates(
  rules: HorizonRuleInput[],
  dayDates: string[],
): Set<string> {
  let primary: HorizonRuleInput | null = null;
  for (const rule of rules) {
    if (rule.type !== "INCOME") continue;
    const sample = dayDates
      .map((d) => recurringMovementForDate(rule, d))
      .find((m) => m && m.cashDelta > 0);
    if (!sample) continue;
    if (!primary || rule.amount > primary.amount) {
      primary = rule;
    }
  }

  const dates = new Set<string>();
  if (!primary) return dates;
  for (const date of dayDates) {
    const movement = recurringMovementForDate(primary, date);
    if (movement && movement.cashDelta > 0) {
      dates.add(date);
    }
  }
  return dates;
}

export function buildMapaDayFlags(input: {
  date: string;
  balance: number;
  closingDay: number;
  dueDay: number;
  payday: boolean;
}): MapaDayFlags {
  return {
    closing: isCardClosingDay(input.date, input.closingDay),
    due: isCardDueDay(input.date, input.closingDay, input.dueDay),
    payday: input.payday,
    red: input.balance < 0,
  };
}

export function buildMapaDaySnapshots(input: {
  dayDates: string[];
  balanceByDate: Map<string, number>;
  cashNetByDate: Map<string, number>;
  openInvoiceByDate: Map<string, number>;
  closingDay: number;
  dueDay: number;
  paydayDates: Set<string>;
}): MapaDaySnapshot[] {
  return input.dayDates.map((date) => {
    const balance = input.balanceByDate.get(date) ?? 0;
    return {
      date,
      balance,
      cashNet: input.cashNetByDate.get(date) ?? 0,
      openInvoice: input.openInvoiceByDate.get(date) ?? 0,
      flags: buildMapaDayFlags({
        date,
        balance,
        closingDay: input.closingDay,
        dueDay: input.dueDay,
        payday: input.paydayDates.has(date),
      }),
    };
  });
}

function dueDateInMonth(
  year: number,
  month: number,
  closingDay: number,
  dueDay: number,
): string | null {
  const dates = monthDayDates(year, month);
  for (const date of dates) {
    if (isCardDueDay(date, closingDay, dueDay)) return date;
  }
  return null;
}

/**
 * Card cycle story for the hero card: open invoice now + amount due this month.
 */
export function buildInvoiceStory(input: {
  asOfDate: string;
  year: number;
  month: number;
  closingDay: number;
  dueDay: number;
  charges: CardChargePoint[];
}): MapaInvoiceStory {
  const dayDates = [input.asOfDate];
  const openByDate = buildOpenInvoiceRunningByDate(
    dayDates,
    input.charges,
    input.closingDay,
    input.dueDay,
  );
  const openAmount = openByDate.get(input.asOfDate) ?? 0;

  const dueDate =
    dueDateInMonth(
      input.year,
      input.month,
      input.closingDay,
      input.dueDay,
    ) ?? input.asOfDate;

  const dueAmount = closedInvoiceDueOnDate(
    dueDate,
    input.charges,
    input.closingDay,
    input.dueDay,
  );

  return {
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    openAmount: Math.round(openAmount * 100) / 100,
    dueAmount: Math.round(dueAmount * 100) / 100,
  };
}

/**
 * Card-cycle phase for a calendar day in the visible month.
 * open → close → closed-to-pay → pay → open again.
 */
export function cyclePhaseForDay(
  day: number,
  closingDay: number,
  dueDay: number,
  lastDay: number,
): CycleRibbonPhase {
  const close = Math.min(Math.max(1, closingDay), lastDay);
  const due = Math.min(Math.max(1, dueDay), lastDay);

  if (day === close) return "close";
  if (day === due) return "pay";

  if (due > close) {
    if (day > close && day < due) return "closed";
    return "open";
  }

  // due before close in the same month (e.g. close 25, due 10)
  if (day > close || day < due) return "closed";
  return "open";
}

/** Continuous ribbon segments aligned to month days 1..lastDay. */
export function buildCycleRibbonSegments(
  year: number,
  month: number,
  closingDay: number,
  dueDay: number,
): CycleRibbonSegment[] {
  const lastDay = daysInMonth(year, month);
  if (lastDay < 1) return [];

  const segments: CycleRibbonSegment[] = [];
  let current = cyclePhaseForDay(1, closingDay, dueDay, lastDay);
  let start = 1;

  for (let day = 2; day <= lastDay; day++) {
    const phase = cyclePhaseForDay(day, closingDay, dueDay, lastDay);
    if (phase === current) continue;
    segments.push({ phase: current, startDay: start, endDay: day - 1 });
    current = phase;
    start = day;
  }
  segments.push({ phase: current, startDay: start, endDay: lastDay });
  return segments;
}

/** Worst balance band in the month — for year overlay / red-dot pills. */
export function summarizeMonthHeat(
  days: Array<Pick<MapaDaySnapshot, "balance">>,
  lowThreshold = 500,
): { band: BalanceBand; hasRed: boolean } {
  let worst: BalanceBand = "ok";
  let hasRed = false;
  for (const day of days) {
    const band = balanceBand(day.balance, lowThreshold);
    if (band === "bad") {
      hasRed = true;
      worst = "bad";
    } else if (band === "low" && worst === "ok") {
      worst = "low";
    }
  }
  return { band: worst, hasRed };
}

/** Cash net for a projected future day (recurrings + one-off cash). */
export function projectedCashNetForDate(
  rules: HorizonRuleInput[],
  date: string,
  cashDeltaByDate: Map<string, number>,
): number {
  const net =
    projectedRecurringNetForDate(rules, date) +
    (cashDeltaByDate.get(date) ?? 0);
  return Math.round(net * 100) / 100;
}

/** Causes for crunch labels on a projected day. */
export function projectedCashCausesForDate(
  rules: HorizonRuleInput[],
  date: string,
  oneOffCauses: MapaCashCause[],
): MapaCashCause[] {
  const causes: MapaCashCause[] = [];
  for (const rule of rules) {
    const movement = recurringMovementForDate(rule, date);
    if (!movement || movement.cashDelta === 0) continue;
    causes.push({
      label: movement.label,
      cashDelta: movement.cashDelta,
    });
  }
  causes.push(...oneOffCauses);
  return causes;
}
