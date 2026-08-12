import { prisma } from "@/lib/db";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { ledgerRowHasActivity } from "@/lib/design";
import { getLedgerMonth, getUserOpeningBalance } from "@/lib/services/ledger";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import type {
  HorizonData,
  HorizonDayCell,
  HorizonMonthColumn,
  HorizonSummary,
} from "@/types";

const DEFAULT_LOW_THRESHOLD = 500;
const DEFAULT_MONTHS = 3;

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
): number {
  switch (column) {
    case "INCOME":
      return amount;
    case "SAVINGS":
      return amount;
    case "EXPENSE":
    case "DAILY":
    case "CARD":
      return -amount;
    default:
      return 0;
  }
}

async function getRecurringRules(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: { userId, active: true },
    include: { category: true },
  });
}

function projectedRecurringForDate(
  rules: Awaited<ReturnType<typeof getRecurringRules>>,
  dateStr: string,
): number {
  const date = parseDateOnly(dateStr);
  const day = date.getUTCDate();
  const lastDay = daysInMonth(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
  );

  let net = 0;
  for (const rule of rules) {
    const ruleDay = Math.min(rule.dayOfMonth, lastDay);
    if (ruleDay !== day) continue;

    const column = resolveLedgerColumn(null, rule.category.ledgerColumn);
    net += netEffectForColumn(column, Number(rule.amount));
  }

  return net;
}

function buildSummary(
  today: string,
  balanceByDate: Map<string, number>,
  endDate: string,
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
  };
}

function buildDayCell(
  dateStr: string,
  today: string,
  balance: number,
  prevBalance: number,
  recurringDelta: number,
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
    hasRecurring: isFuture ? recurringDelta !== 0 : hasPastMovement,
    delta: balance - prevBalance,
  };
}

export async function getHorizon(
  userId: string,
  startDate: string,
  months = DEFAULT_MONTHS,
  lowThreshold = DEFAULT_LOW_THRESHOLD,
): Promise<HorizonData> {
  const today = startDate;
  const [year, month] = today.split("-").map(Number);

  await ensureRecurringTransactions(userId, today, addDays(today, months * 31));

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
      const column = resolveLedgerColumn(tx.ledgerColumn, tx.category.ledgerColumn);
      balance += netEffectForColumn(column, Number(tx.amount));
    }
  }

  const rules = await getRecurringRules(userId);
  const endDate = addDays(today, months * 31);

  const balanceByDate = new Map<string, number>();
  let cursor = today;
  let running = balance;

  while (cursor <= endDate) {
    if (cursor > today) {
      running += projectedRecurringForDate(rules, cursor);
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

      const recurringDelta = projectedRecurringForDate(rules, dateStr);
      const pastRow = ledgerRowByDate.get(dateStr);
      const hasPastMovement = pastRow ? ledgerRowHasActivity(pastRow) : false;
      const prevBalance = previousBalance(dateStr);

      days.push(
        buildDayCell(
          dateStr,
          today,
          cellBalance,
          prevBalance,
          recurringDelta,
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

  return {
    today,
    monthsCount: months,
    months: monthColumns,
    lowThreshold,
    summary: buildSummary(today, balanceByDate, endDate),
  };
}
