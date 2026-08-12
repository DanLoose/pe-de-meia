import { prisma } from "@/lib/db";
import { formatDateOnly, getMonthDateRange } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import { ensureCardInvoices } from "@/lib/services/card";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import { monthQuerySchema } from "@/lib/validators/transaction";
import type { MonthTotalsData } from "@/types";

export async function getMonthTotals(
  userId: string,
  year: number,
  month: number,
): Promise<MonthTotalsData> {
  const parsed = monthQuerySchema.parse({ year, month });
  const { start, end } = getMonthDateRange(parsed.year, parsed.month);
  const startDate = formatDateOnly(start);
  const endDate = formatDateOnly(end);

  await ensureRecurringTransactions(userId, startDate, endDate);
  await ensureCardInvoices(userId, startDate, endDate);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lte: end },
    },
    include: { category: true },
  });

  let totalIncome = 0;
  let totalExpenseOut = 0;
  let totalDaily = 0;
  let totalSavings = 0;
  let totalCard = 0;
  const dailyDays = new Set<string>();

  for (const tx of transactions) {
    const column = resolveLedgerColumn(tx.ledgerColumn, tx.category.ledgerColumn);
    const amount = Number(tx.amount);

    switch (column) {
      case "INCOME":
        totalIncome += amount;
        break;
      case "EXPENSE":
        totalExpenseOut += amount;
        break;
      case "DAILY":
        totalDaily += amount;
        dailyDays.add(formatDateOnly(tx.date));
        break;
      case "SAVINGS":
        totalSavings += amount;
        break;
      case "CARD":
        if (tx.affectsBalance) {
          totalCard += amount;
        }
        break;
    }
  }

  const costOfLiving = totalExpenseOut + totalDaily + totalCard;
  const performance = totalIncome - costOfLiving;
  const savedPercent =
    totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const dailyAverage =
    dailyDays.size > 0 ? totalDaily / dailyDays.size : 0;

  const { dailyCeiling } = await getDailyCeiling(userId);

  return {
    year: parsed.year,
    month: parsed.month,
    performance,
    performanceStatus:
      performance >= 0 ? "Sobrou dinheiro" : "No vermelho",
    saved: totalSavings,
    savedPercent,
    savedStatus:
      totalSavings <= 0
        ? "Nada guardado este mês"
        : `${savedPercent.toFixed(0)}% guardado`,
    costOfLiving,
    costOfLivingStatus:
      costOfLiving <= totalIncome
        ? "Dentro da renda"
        : "Acima da renda",
    dailyAverage,
    dailyCeiling,
    dailyStatus: buildDailyStatus(dailyAverage, dailyCeiling),
    totalIncome,
    totalExpense: totalExpenseOut + totalDaily + totalCard,
  };
}

function buildDailyStatus(average: number, ceiling: number | null): string {
  if (ceiling === null || ceiling <= 0) {
    return "Sem teto configurado";
  }
  if (average <= ceiling) {
    return `Abaixo do teto de ${formatBRL(ceiling)}/dia`;
  }
  return `Acima do teto de ${formatBRL(ceiling)}/dia`;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
