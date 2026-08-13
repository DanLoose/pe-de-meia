/**
 * Variable-estimate burn for Projeção.
 * Toggle OFF (`HORIZON_VARIABLE_ESTIMATE_ENABLED = false`) to revert this experiment.
 */
export const HORIZON_VARIABLE_ESTIMATE_ENABLED = true;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parseYmd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

function formatYmd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function roundCent(value: number) {
  return Math.round(value * 100) / 100;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Spread `total` across `dates` (earlier days get +R$0,01 when needed). */
export function allocateEvenly(
  total: number,
  dates: string[],
): Map<string, number> {
  const result = new Map<string, number>();
  if (total <= 0 || dates.length === 0) return result;

  const cents = Math.round(total * 100);
  const base = Math.floor(cents / dates.length);
  let leftover = cents - base * dates.length;

  for (const date of dates) {
    const extra = leftover > 0 ? 1 : 0;
    if (leftover > 0) leftover -= 1;
    const amount = (base + extra) / 100;
    if (amount > 0) result.set(date, amount);
  }

  return result;
}

function futureDatesInMonth(
  year: number,
  month: number,
  today: string,
  endDate: string,
): string[] {
  const dayCount = daysInMonth(year, month);
  const dates: string[] = [];
  for (let day = 1; day <= dayCount; day++) {
    const dateStr = formatYmd(year, month, day);
    if (dateStr <= today) continue;
    if (dateStr > endDate) break;
    dates.push(dateStr);
  }
  return dates;
}

/**
 * Daily variable-estimate outflows (map values = cash leaving).
 * - Current month: max(0, estimate − spentDailyToDate) on days after today.
 * - Future months: full estimate on days in range.
 * - No carry into the next month (unspent plan stays in today's cash).
 */
export function buildVariableEstimateBurn(options: {
  today: string;
  endDate: string;
  monthlyEstimate: number;
  spentInCurrentMonth: number;
}): Map<string, number> {
  const burn = new Map<string, number>();
  if (!HORIZON_VARIABLE_ESTIMATE_ENABLED) return burn;

  const estimate = roundCent(options.monthlyEstimate);
  if (estimate <= 0) return burn;

  const today = parseYmd(options.today);
  const end = parseYmd(options.endDate);

  let year = today.year;
  let month = today.month;

  while (year < end.year || (year === end.year && month <= end.month)) {
    const isCurrent = year === today.year && month === today.month;
    const dates = futureDatesInMonth(
      year,
      month,
      options.today,
      options.endDate,
    );

    const amountForMonth = isCurrent
      ? Math.max(0, roundCent(estimate - options.spentInCurrentMonth))
      : estimate;

    const slice = allocateEvenly(amountForMonth, dates);
    for (const [date, amount] of slice) {
      burn.set(date, roundCent((burn.get(date) ?? 0) + amount));
    }

    const next = shiftMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }

  return burn;
}

export function variableEstimateMovement(
  dateStr: string,
  amount: number,
  label: string,
) {
  return {
    id: `estimate:variable:${dateStr}`,
    source: "estimate" as const,
    label,
    amount,
    type: "EXPENSE" as const,
    ledgerColumn: "DAILY" as const,
    cashDelta: -amount,
  };
}
