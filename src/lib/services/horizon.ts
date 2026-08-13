import { cashDelta } from "@/lib/cash";
import { futureCashDeltaByDate } from "@/lib/horizon-cash";
import {
  projectedRecurringNetForDate,
  recurringMovementForDate,
  type HorizonRuleInput,
} from "@/lib/horizon-recurring";
import {
  HORIZON_VARIABLE_ESTIMATE_ENABLED,
  buildVariableEstimateBurn,
  variableEstimateMovement,
} from "@/lib/horizon-variable";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { ledgerRowHasActivity } from "@/lib/design";
import { ensureCardInvoices } from "@/lib/services/card";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import { getLedgerMonth, getUserOpeningBalance } from "@/lib/services/ledger";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import { copy } from "@/lib/copy";
import type {
  HorizonData,
  HorizonDayCell,
  HorizonDayMovement,
  HorizonMonthColumn,
  HorizonSummary,
} from "@/types";
import { prisma } from "@/lib/db";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";

const DEFAULT_LOW_THRESHOLD = 500;
const DEFAULT_MONTHS = 12;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

function monthShortLabel(year: number, month: number): string {
  const short = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
  return `${short}/${String(year).slice(-2)}`;
}

function netEffectForColumn(
  column: ReturnType<typeof resolveLedgerColumn>,
  amount: number,
  affectsBalance = true,
): number {
  return cashDelta(column, amount, affectsBalance);
}

async function getRecurringRules(userId: string): Promise<HorizonRuleInput[]> {
  const rules = await prisma.recurringTransaction.findMany({
    where: { userId, active: true },
    include: { category: true },
  });

  return rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    amount: Number(rule.amount),
    description: rule.description,
    dayOfMonth: rule.dayOfMonth,
    startsOn: formatDateOnly(rule.startsOn),
    endsOn: rule.endsOn ? formatDateOnly(rule.endsOn) : null,
    categoryName: rule.category.name,
    categoryLedgerColumn: rule.ledgerColumn,
  }));
}

function buildSummary(
  today: string,
  balanceByDate: Map<string, number>,
  endDate: string,
  totalIncome: number,
  totalExpense: number,
): HorizonSummary {
  const currentBalance = balanceByDate.get(today) ?? 0;

  let endBalance = currentBalance;
  let lowestBalance = currentBalance;
  let lowestDate = today;
  let firstNegativeDate: string | null = null;
  let firstNegativeBalance: number | null = null;

  let cursor = today;
  while (cursor <= endDate) {
    const balance = balanceByDate.get(cursor) ?? endBalance;
    endBalance = balance;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestDate = cursor;
    }

    if (firstNegativeDate === null && balance < 0) {
      firstNegativeDate = cursor;
      firstNegativeBalance = balance;
    }

    cursor = addDays(cursor, 1);
  }

  return {
    currentBalance,
    endBalance,
    lowestBalance,
    lowestDate,
    firstNegativeDate,
    firstNegativeBalance,
    totalIncome,
    totalExpense,
  };
}

function accumulateHorizonFlows(
  months: HorizonMonthColumn[],
  today: string,
): { totalIncome: number; totalExpense: number } {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const month of months) {
    for (const day of month.days) {
      if (day.date < today) continue;
      for (const movement of day.movements) {
        if (movement.cashDelta > 0) totalIncome += movement.cashDelta;
        else if (movement.cashDelta < 0) totalExpense += -movement.cashDelta;
      }
    }
  }

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
  };
}

function buildDayMovements(
  dateStr: string,
  today: string,
  rules: HorizonRuleInput[],
  txs: Array<{
    id: string;
    type: HorizonDayMovement["type"];
    amount: number;
    description: string | null;
    recurringId: string | null;
    ledgerColumn: HorizonDayMovement["ledgerColumn"] | null;
    categoryName: string;
    categoryLedgerColumn: HorizonDayMovement["ledgerColumn"];
    affectsBalance: boolean;
  }>,
  variableBurnByDate: Map<string, number>,
): HorizonDayMovement[] {
  const movements: HorizonDayMovement[] = [];
  const coveredRuleIds = new Set<string>();

  if (dateStr > today) {
    for (const rule of rules) {
      const item = recurringMovementForDate(rule, dateStr);
      if (!item) continue;
      coveredRuleIds.add(rule.id);
      movements.push(item);
    }

    for (const tx of txs) {
      if (tx.recurringId && coveredRuleIds.has(tx.recurringId)) continue;
      if (!tx.affectsBalance) continue;
      const column = resolveLedgerColumn(
        tx.ledgerColumn,
        tx.categoryLedgerColumn,
      );
      movements.push({
        id: tx.id,
        source: tx.recurringId ? "recurring" : "transaction",
        ruleId: tx.recurringId ?? undefined,
        label: tx.description?.trim() || tx.categoryName,
        amount: tx.amount,
        type: tx.type,
        ledgerColumn: column,
        cashDelta: cashDelta(column, tx.amount, tx.affectsBalance),
      });
    }

    const estimateAmount = variableBurnByDate.get(dateStr) ?? 0;
    if (estimateAmount > 0) {
      movements.push(
        variableEstimateMovement(
          dateStr,
          estimateAmount,
          copy.horizon.variableEstimateLabel,
        ),
      );
    }
  } else {
    for (const tx of txs) {
      const column = resolveLedgerColumn(
        tx.ledgerColumn,
        tx.categoryLedgerColumn,
      );
      movements.push({
        id: tx.id,
        source: tx.recurringId ? "recurring" : "transaction",
        ruleId: tx.recurringId ?? undefined,
        label: tx.description?.trim() || tx.categoryName,
        amount: tx.amount,
        type: tx.type,
        ledgerColumn: column,
        cashDelta: cashDelta(column, tx.amount, tx.affectsBalance),
      });
    }
  }

  return movements;
}

function buildDayCell(
  dateStr: string,
  today: string,
  balance: number,
  prevBalance: number,
  movements: HorizonDayMovement[],
  hasPastMovement: boolean,
): HorizonDayCell {
  const isPast = dateStr < today;
  const isToday = dateStr === today;
  const isFuture = dateStr > today;

  return {
    date: dateStr,
    balance,
    isPast,
    isToday,
    isFuture,
    isProjected: isFuture,
    hasRecurring: isFuture
      ? movements.length > 0
      : hasPastMovement || movements.length > 0,
    delta: balance - prevBalance,
    movements,
  };
}

export async function getHorizon(
  userId: string,
  startDate: string,
  months = DEFAULT_MONTHS,
  {
    lowThreshold = DEFAULT_LOW_THRESHOLD,
    includeVariableEstimate = true,
  }: {
    lowThreshold?: number;
    includeVariableEstimate?: boolean;
  } = {},
): Promise<HorizonData> {
  const today = startDate;
  const [year, month] = today.split("-").map(Number);
  const endDate = addDays(today, months * 31);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;

  await ensureRecurringTransactions(userId, today, endDate);
  await ensureCardInvoices(userId, today, endDate);

  const ledger = await getLedgerMonth(userId, year, month);
  const todayRow = ledger.rows.find((row) => row.date === today);
  let balance = todayRow?.balance ?? (await getUserOpeningBalance(userId));

  const pastTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { lte: parseDateOnly(today) },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  if (!todayRow) {
    balance = Number(await getUserOpeningBalance(userId));
    for (const tx of pastTransactions) {
      const column = resolveLedgerColumn(
        tx.ledgerColumn,
        tx.category.ledgerColumn,
      );
      balance += netEffectForColumn(
        column,
        Number(tx.amount),
        tx.affectsBalance,
      );
    }
  }

  const rules = await getRecurringRules(userId);

  const rangeTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: parseDateOnly(monthStart),
        lte: parseDateOnly(endDate),
      },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const txsByDate = new Map<
    string,
    Array<{
      id: string;
      type: HorizonDayMovement["type"];
      amount: number;
      description: string | null;
      recurringId: string | null;
      ledgerColumn: HorizonDayMovement["ledgerColumn"] | null;
      categoryName: string;
      categoryLedgerColumn: HorizonDayMovement["ledgerColumn"];
      affectsBalance: boolean;
    }>
  >();

  for (const tx of rangeTxs) {
    const dateStr = formatDateOnly(tx.date);
    const list = txsByDate.get(dateStr) ?? [];
    list.push({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      description: tx.description,
      recurringId: tx.recurringId,
      ledgerColumn: tx.ledgerColumn,
      categoryName: tx.category.name,
      categoryLedgerColumn: tx.category.ledgerColumn,
      affectsBalance: tx.affectsBalance,
    });
    txsByDate.set(dateStr, list);
  }

  const futureCashTxs = rangeTxs.filter(
    (tx) => formatDateOnly(tx.date) > today && tx.affectsBalance,
  );

  const cashDeltaByDate = futureCashDeltaByDate(
    futureCashTxs.map((tx) => ({
      date: formatDateOnly(tx.date),
      amount: Number(tx.amount),
      ledgerColumn: tx.ledgerColumn,
      categoryLedgerColumn: tx.category.ledgerColumn,
      affectsBalance: tx.affectsBalance,
      recurringId: tx.recurringId,
    })),
  );

  const ceiling = await getDailyCeiling(userId);
  const monthlyVariableEstimate = ceiling.totalFixed;

  let spentVariableCurrentMonth = 0;
  for (const tx of rangeTxs) {
    const dateStr = formatDateOnly(tx.date);
    if (dateStr > today) continue;
    const [ty, tm] = today.split("-").map(Number);
    const [dy, dm] = dateStr.split("-").map(Number);
    if (dy !== ty || dm !== tm) continue;
    const column = resolveLedgerColumn(
      tx.ledgerColumn,
      tx.category.ledgerColumn,
    );
    if (column === "DAILY") {
      spentVariableCurrentMonth += Number(tx.amount);
    }
  }

  const variableBurnByDate =
    HORIZON_VARIABLE_ESTIMATE_ENABLED && includeVariableEstimate
      ? buildVariableEstimateBurn({
          today,
          endDate,
          monthlyEstimate: monthlyVariableEstimate,
          spentInCurrentMonth: spentVariableCurrentMonth,
        })
      : new Map<string, number>();

  const balanceByDate = new Map<string, number>();
  let cursor = today;
  let running = balance;

  while (cursor <= endDate) {
    if (cursor > today) {
      running += projectedRecurringNetForDate(rules, cursor);
      running += cashDeltaByDate.get(cursor) ?? 0;
      running -= variableBurnByDate.get(cursor) ?? 0;
    }
    balanceByDate.set(cursor, running);
    cursor = addDays(cursor, 1);
  }

  const ledgerRowByDate = new Map(ledger.rows.map((row) => [row.date, row]));

  const allBalances = new Map<string, number>();
  for (const row of ledger.rows) {
    if (row.date <= today) {
      allBalances.set(row.date, row.balance);
    }
  }
  for (const [dateStr, value] of balanceByDate.entries()) {
    allBalances.set(dateStr, value);
  }

  function previousBalance(dateStr: string): number {
    const prevDate = addDays(dateStr, -1);
    return allBalances.get(prevDate) ?? allBalances.get(dateStr) ?? 0;
  }

  const monthColumns: HorizonMonthColumn[] = [];
  let colYear = year;
  let colMonth = month;

  for (let i = 0; i < months; i++) {
    const dayCount = daysInMonth(colYear, colMonth);
    const days: HorizonDayCell[] = [];

    for (let day = 1; day <= dayCount; day++) {
      const dateStr = `${colYear}-${String(colMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      if (dateStr > endDate) {
        continue;
      }

      let cellBalance: number | null = null;

      if (dateStr >= today) {
        cellBalance = balanceByDate.get(dateStr) ?? running;
      } else {
        const row = ledgerRowByDate.get(dateStr);
        if (row) {
          cellBalance = row.balance;
        }
      }

      if (cellBalance === null) {
        continue;
      }

      const movements = buildDayMovements(
        dateStr,
        today,
        rules,
        txsByDate.get(dateStr) ?? [],
        variableBurnByDate,
      );
      const pastRow = ledgerRowByDate.get(dateStr);
      const hasPastMovement = pastRow ? ledgerRowHasActivity(pastRow) : false;
      const prevBalance = previousBalance(dateStr);

      days.push(
        buildDayCell(
          dateStr,
          today,
          cellBalance,
          prevBalance,
          movements,
          hasPastMovement,
        ),
      );
    }

    monthColumns.push({
      year: colYear,
      month: colMonth,
      label: monthShortLabel(colYear, colMonth),
      days,
    });

    colMonth += 1;
    if (colMonth > 12) {
      colMonth = 1;
      colYear += 1;
    }
  }

  const flows = accumulateHorizonFlows(monthColumns, today);

  return {
    today,
    monthsCount: months,
    months: monthColumns,
    lowThreshold,
    summary: buildSummary(
      today,
      balanceByDate,
      endDate,
      flows.totalIncome,
      flows.totalExpense,
    ),
  };
}

/** Single-day cell for sheets opened from Mapa (same shape as Projeção). */
export async function getHorizonDayCell(
  userId: string,
  date: string,
  today: string,
  includeVariableEstimate = true,
): Promise<HorizonDayCell> {
  const todayMonthStart = `${today.slice(0, 7)}-01`;
  if (date >= todayMonthStart) {
    const data = await getHorizon(userId, today, DEFAULT_MONTHS, {
      includeVariableEstimate,
    });
    for (const month of data.months) {
      const cell = month.days.find((day) => day.date === date);
      if (cell) return cell;
    }
  }

  const [year, month] = date.split("-").map(Number);
  await ensureRecurringTransactions(userId, date, date);
  await ensureCardInvoices(userId, date, date);

  const ledger = await getLedgerMonth(userId, year, month);
  const row = ledger.rows.find((item) => item.date === date);
  const prevDate = addDays(date, -1);
  let prevBalance = 0;

  if (prevDate.slice(0, 7) === date.slice(0, 7)) {
    prevBalance =
      ledger.rows.find((item) => item.date === prevDate)?.balance ??
      (await getUserOpeningBalance(userId));
  } else {
    const [prevYear, prevMonth] = prevDate.split("-").map(Number);
    const prevLedger = await getLedgerMonth(userId, prevYear, prevMonth);
    prevBalance =
      prevLedger.rows.find((item) => item.date === prevDate)?.balance ??
      (await getUserOpeningBalance(userId));
  }

  const balance = row?.balance ?? prevBalance;
  const rules = await getRecurringRules(userId);
  const txs = await prisma.transaction.findMany({
    where: { userId, date: parseDateOnly(date) },
    include: { category: true },
    orderBy: [{ createdAt: "asc" }],
  });

  const mapped = txs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    description: tx.description,
    recurringId: tx.recurringId,
    ledgerColumn: tx.ledgerColumn,
    categoryName: tx.category.name,
    categoryLedgerColumn: tx.category.ledgerColumn,
    affectsBalance: tx.affectsBalance,
  }));

  const movements = buildDayMovements(
    date,
    today,
    rules,
    mapped,
    new Map(),
  );

  return buildDayCell(
    date,
    today,
    balance,
    prevBalance,
    movements,
    row ? ledgerRowHasActivity(row) : movements.length > 0,
  );
}

