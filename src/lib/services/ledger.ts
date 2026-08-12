import { prisma } from "@/lib/db";
import { formatDateOnly, getMonthDateRange } from "@/lib/dates";
import { cashDelta } from "@/lib/cash";
import {
  resolveLedgerColumn,
} from "@/lib/ledger-columns";
import { ensureCardInvoices } from "@/lib/services/card";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import { monthQuerySchema } from "@/lib/validators/transaction";
import type { LedgerDayRow, LedgerMonthData } from "@/types";

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export async function getUserOpeningBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openingBalance: true },
  });
  return user ? Number(user.openingBalance) : 0;
}

export async function getLedgerMonth(
  userId: string,
  year: number,
  month: number,
  openingBalance?: number,
): Promise<LedgerMonthData> {
  const parsed = monthQuerySchema.parse({ year, month });
  const { start, end } = getMonthDateRange(parsed.year, parsed.month);
  const startDate = formatDateOnly(start);
  const endDate = formatDateOnly(end);

  await ensureRecurringTransactions(userId, startDate, endDate);
  await ensureCardInvoices(userId, startDate, endDate);

  const resolvedOpening =
    openingBalance ?? (await getUserOpeningBalance(userId));

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const dayCount = daysInMonth(parsed.year, parsed.month);
  const rows: LedgerDayRow[] = [];
  let runningBalance = resolvedOpening;

  const totals = {
    income: 0,
    expense: 0,
    daily: 0,
    savings: 0,
    card: 0,
  };

  for (let day = 1; day <= dayCount; day++) {
    const dateStr = `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    let income = 0;
    let expense = 0;
    let daily = 0;
    let savings = 0;
    let card = 0;

    for (const tx of transactions) {
      if (formatDateOnly(tx.date) !== dateStr) continue;

      const column = resolveLedgerColumn(
        tx.ledgerColumn,
        tx.category.ledgerColumn,
      );
      const amount = Number(tx.amount);

      switch (column) {
        case "INCOME":
          income += amount;
          break;
        case "EXPENSE":
          expense += amount;
          break;
        case "DAILY":
          daily += amount;
          break;
        case "SAVINGS":
          savings += amount;
          break;
        case "CARD":
          card += amount;
          if (!tx.affectsBalance) {
            totals.card += amount;
          }
          break;
      }

      runningBalance += cashDelta(column, amount, tx.affectsBalance);
    }

    totals.income += income;
    totals.expense += expense;
    totals.daily += daily;
    totals.savings += savings;

    rows.push({
      date: dateStr,
      day,
      income,
      expense,
      daily,
      savings,
      card,
      balance: runningBalance,
    });
  }

  return {
    year: parsed.year,
    month: parsed.month,
    openingBalance: resolvedOpening,
    rows,
    totals: {
      ...totals,
      balance: runningBalance,
    },
  };
}
