import { formatDateOnly, getMonthDateRange, parseDateOnly } from "@/lib/dates";
import { defaultAffectsBalance } from "@/lib/cash";
import type { LedgerColumn, RecurringTransactionDTO, TransactionType } from "@/types";

/** Como o movimento afeta o caixa: à vista vs crédito. */
export type CommitmentMapPayMode = "cash" | "card";

export function payModeFromLedgerColumn(
  column: LedgerColumn | null | undefined,
): CommitmentMapPayMode {
  return column === "CARD" ? "card" : "cash";
}

export interface CommitmentMapEvent {
  id: string;
  ruleId: string;
  date: string;
  day: number;
  type: TransactionType;
  amount: number;
  label: string;
  categoryColor: string;
  active: boolean;
  payMode: CommitmentMapPayMode;
  /** Se true, entra no total do dia (caixa). Compras no crédito ficam false. */
  affectsCash: boolean;
}

export interface CommitmentMapDay {
  date: string;
  day: number;
  events: CommitmentMapEvent[];
}

export interface CommitmentPieSlice {
  id: string;
  label: string;
  amount: number;
  color: string;
  kind: "fixed" | "variable";
}

export interface CommitmentMapSummary {
  year: number;
  month: number;
  days: CommitmentMapDay[];
  events: CommitmentMapEvent[];
  fixedIncome: number;
  fixedExpense: number;
  variableEstimate: number;
  costOfLiving: number;
  folga: number;
  slices: CommitmentPieSlice[];
}

function ruleAppliesToMonth(
  startsOn: string,
  endsOn: string | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  const start = parseDateOnly(startsOn);
  if (start > monthEnd) return false;
  if (endsOn) {
    const end = parseDateOnly(endsOn);
    if (end < monthStart) return false;
  }
  return true;
}

function occurrenceInMonth(
  rule: RecurringTransactionDTO,
  year: number,
  month: number,
  monthStart: Date,
  monthEnd: Date,
): CommitmentMapEvent | null {
  if (!rule.active) return null;
  if (!ruleAppliesToMonth(rule.startsOn, rule.endsOn, monthStart, monthEnd)) {
    return null;
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(rule.dayOfMonth, lastDay);
  const date = new Date(Date.UTC(year, month - 1, day));
  const ruleStart = parseDateOnly(rule.startsOn);
  const ruleEnd = rule.endsOn ? parseDateOnly(rule.endsOn) : null;

  if (date < ruleStart || date < monthStart) return null;
  if (ruleEnd && date > ruleEnd) return null;
  if (date > monthEnd) return null;

  const label =
    rule.description?.trim() ||
    rule.categoryName ||
    (rule.type === "INCOME" ? "Receita" : "Gasto");

  const ledgerColumn = rule.ledgerColumn;
  return {
    id: `${rule.id}-${formatDateOnly(date)}`,
    ruleId: rule.id,
    date: formatDateOnly(date),
    day,
    type: rule.type,
    amount: rule.amount,
    label,
    categoryColor: rule.categoryColor,
    active: rule.active,
    payMode: payModeFromLedgerColumn(ledgerColumn),
    affectsCash: defaultAffectsBalance(ledgerColumn),
  };
}

const VARIABLE_COLOR = "oklch(0.62 0.12 85)";
const FIXED_FALLBACK = [
  "oklch(0.58 0.14 25)",
  "oklch(0.55 0.12 40)",
  "oklch(0.52 0.1 350)",
  "oklch(0.5 0.08 20)",
  "oklch(0.48 0.09 15)",
];

function buildPieSlices(
  events: CommitmentMapEvent[],
  variableEstimate: number,
): CommitmentPieSlice[] {
  const expenseEvents = events.filter((e) => e.type === "EXPENSE");
  const byCategory = new Map<
    string,
    { label: string; amount: number; color: string }
  >();

  for (const event of expenseEvents) {
    const key = event.ruleId;
    const existing = byCategory.get(key);
    if (existing) {
      existing.amount += event.amount;
    } else {
      byCategory.set(key, {
        label: event.label,
        amount: event.amount,
        color: event.categoryColor || FIXED_FALLBACK[byCategory.size % FIXED_FALLBACK.length]!,
      });
    }
  }

  const slices: CommitmentPieSlice[] = [...byCategory.entries()]
    .map(([id, value]) => ({
      id,
      label: value.label,
      amount: value.amount,
      color: value.color,
      kind: "fixed" as const,
    }))
    .sort((a, b) => b.amount - a.amount);

  const MAX_FIXED_SLICES = 5;
  let fixedSlices = slices;
  if (slices.length > MAX_FIXED_SLICES) {
    const head = slices.slice(0, MAX_FIXED_SLICES - 1);
    const rest = slices.slice(MAX_FIXED_SLICES - 1);
    const otherAmount = rest.reduce((sum, s) => sum + s.amount, 0);
    fixedSlices = [
      ...head,
      {
        id: "other-fixed",
        label: "Outros fixos",
        amount: otherAmount,
        color: FIXED_FALLBACK[4]!,
        kind: "fixed",
      },
    ];
  }

  if (variableEstimate > 0) {
    fixedSlices.push({
      id: "variable",
      label: "Variáveis (estimativa)",
      amount: variableEstimate,
      color: VARIABLE_COLOR,
      kind: "variable",
    });
  }

  return fixedSlices;
}

/** Build the commitments calendar map for a month (plan view, no ledger writes). */
export function buildCommitmentMap(
  recurrings: RecurringTransactionDTO[],
  year: number,
  month: number,
  variableEstimate = 0,
): CommitmentMapSummary {
  const { start, end } = getMonthDateRange(year, month);
  const events: CommitmentMapEvent[] = [];

  for (const rule of recurrings) {
    const event = occurrenceInMonth(rule, year, month, start, end);
    if (event) events.push(event);
  }

  events.sort((a, b) => a.day - b.day || a.label.localeCompare(b.label, "pt-BR"));

  const lastDay = end.getUTCDate();
  const byDate = new Map<string, CommitmentMapEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }

  const days: CommitmentMapDay[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const date = formatDateOnly(new Date(Date.UTC(year, month - 1, day)));
    days.push({
      date,
      day,
      events: byDate.get(date) ?? [],
    });
  }

  let fixedIncome = 0;
  let fixedExpense = 0;
  for (const event of events) {
    if (event.type === "INCOME") fixedIncome += event.amount;
    else fixedExpense += event.amount;
  }

  const variable = Math.max(0, variableEstimate);
  const costOfLiving = fixedExpense + variable;
  const folga = fixedIncome - costOfLiving;

  return {
    year,
    month,
    days,
    events,
    fixedIncome,
    fixedExpense,
    variableEstimate: variable,
    costOfLiving,
    folga,
    slices: buildPieSlices(events, variable),
  };
}
