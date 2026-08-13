import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import { cashDelta, defaultAffectsBalance } from "@/lib/cash";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import type { HorizonDayMovement, LedgerColumn, TransactionType } from "@/types";

export interface HorizonRuleInput {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  dayOfMonth: number;
  startsOn: string;
  endsOn: string | null;
  categoryName: string;
  categoryLedgerColumn: LedgerColumn;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Whether an active recurring rule lands on this calendar date (honors startsOn/endsOn). */
export function ruleOccursOnDate(
  rule: Pick<HorizonRuleInput, "dayOfMonth" | "startsOn" | "endsOn">,
  dateStr: string,
): boolean {
  const date = parseDateOnly(dateStr);
  const lastDay = daysInMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  const ruleDay = Math.min(rule.dayOfMonth, lastDay);
  if (ruleDay !== date.getUTCDate()) return false;

  const start = parseDateOnly(rule.startsOn);
  if (date < start) return false;
  if (rule.endsOn) {
    const end = parseDateOnly(rule.endsOn);
    if (date > end) return false;
  }
  return true;
}

export function recurringMovementForDate(
  rule: HorizonRuleInput,
  dateStr: string,
): HorizonDayMovement | null {
  if (!ruleOccursOnDate(rule, dateStr)) return null;

  const column = resolveLedgerColumn(null, rule.categoryLedgerColumn);
  const amount = rule.amount;
  const delta = cashDelta(column, amount, defaultAffectsBalance(column));
  const label =
    rule.description?.trim() ||
    rule.categoryName ||
    (rule.type === "INCOME" ? "Receita" : "Gasto");

  return {
    id: `rule:${rule.id}:${dateStr}`,
    source: "recurring",
    ruleId: rule.id,
    label,
    amount,
    type: rule.type,
    ledgerColumn: column,
    cashDelta: delta,
  };
}

export function projectedRecurringNetForDate(
  rules: HorizonRuleInput[],
  dateStr: string,
): number {
  let net = 0;
  for (const rule of rules) {
    const item = recurringMovementForDate(rule, dateStr);
    if (item) net += item.cashDelta;
  }
  return net;
}

export function formatDateKey(date: Date): string {
  return formatDateOnly(date);
}
