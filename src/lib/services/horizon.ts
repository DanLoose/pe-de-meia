import { prisma } from "@/lib/db";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { getLedgerMonth, getUserOpeningBalance } from "@/lib/services/ledger";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import type { HorizonData, HorizonDayCell, HorizonMonthColumn } from "@/types";

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
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(year, month - 1, 1));
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

  const monthColumns: HorizonMonthColumn[] = [];
  let colYear = year;
  let colMonth = month;

  for (let i = 0; i < months; i++) {
    const dayCount = daysInMonth(colYear, colMonth);
    const days: HorizonDayCell[] = [];

    for (let day = 1; day <= dayCount; day++) {
      const dateStr = `${colYear}-${String(colMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (dateStr >= today && dateStr <= endDate) {
        days.push({
          date: dateStr,
          balance: balanceByDate.get(dateStr) ?? running,
        });
      } else if (dateStr < today) {
        const row = ledger.rows.find((r) => r.date === dateStr);
        if (row) {
          days.push({ date: dateStr, balance: row.balance });
        }
      }
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
    months: monthColumns,
    lowThreshold,
  };
}
