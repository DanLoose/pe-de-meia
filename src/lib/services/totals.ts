import { prisma } from "@/lib/db";
import { copy } from "@/lib/copy";
import { formatDateOnly, getMonthDateRange } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import { ensureCardInvoices } from "@/lib/services/card";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import { monthQuerySchema } from "@/lib/validators/transaction";
import type { MonthTotalsData, TotalsVerdict } from "@/types";

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

  const [transactions, recurrings, ceiling] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { category: true },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, active: true },
    }),
    getDailyCeiling(userId),
  ]);

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

  let fixedIncome = 0;
  let fixedExpense = 0;
  for (const rule of recurrings) {
    if (!recurringAppliesToMonth(rule.startsOn, rule.endsOn, start, end)) {
      continue;
    }
    const amount = Number(rule.amount);
    if (rule.type === "INCOME") {
      fixedIncome += amount;
    } else {
      fixedExpense += amount;
    }
  }

  const variableEstimate = ceiling.totalFixed > 0 ? ceiling.totalFixed : null;
  const variablePart = variableEstimate ?? 0;
  // V1: custo de vida = gastos fixos + estimativa de variáveis
  const costOfLiving = fixedExpense + variablePart;
  // V1: folga / performance = receitas fixas − custo de vida
  const performance = fixedIncome - costOfLiving;
  const hasCosts = fixedExpense > 0 || variableEstimate !== null;
  const setupComplete = fixedIncome > 0 && hasCosts;
  const verdict = resolveVerdict(fixedIncome, performance);

  const savedPercent =
    totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const dailyAverage =
    dailyDays.size > 0 ? totalDaily / dailyDays.size : 0;

  return {
    year: parsed.year,
    month: parsed.month,
    performance,
    performanceStatus: verdictStatus(verdict, hasCosts),
    fixedIncome,
    fixedExpense,
    setupComplete,
    verdict,
    saved: totalSavings,
    savedPercent,
    savedStatus:
      totalSavings <= 0
        ? "Nada guardado este mês"
        : `${savedPercent.toFixed(0)}% guardado`,
    costOfLiving,
    costOfLivingStatus:
      fixedIncome <= 0 && costOfLiving <= 0
        ? "Configure receitas e gastos fixos"
        : fixedIncome <= 0
          ? copy.totals.verdictMissingIncome
          : costOfLiving <= fixedIncome
            ? "Dentro da renda fixa"
            : "Acima da renda fixa",
    dailyAverage,
    dailyCeiling: ceiling.dailyCeiling,
    variableEstimate,
    dailyStatus: buildVariableEstimateStatus(variableEstimate),
    totalIncome,
    totalExpense: totalExpenseOut + totalDaily + totalCard,
  };
}

function resolveVerdict(
  fixedIncome: number,
  folga: number,
): TotalsVerdict {
  // Sem receita fixa: empty + CTA (mesmo se houver custo).
  if (fixedIncome <= 0) {
    return "empty";
  }
  if (folga < 0) {
    return "deficit";
  }
  if (folga > 0 && folga >= fixedIncome * 0.1) {
    return "surplus";
  }
  return "tight";
}

function verdictStatus(verdict: TotalsVerdict, hasCosts: boolean): string {
  switch (verdict) {
    case "surplus":
      return copy.totals.verdictSurplus;
    case "tight":
      return copy.totals.verdictTight;
    case "deficit":
      return copy.totals.verdictDeficit;
    case "empty":
      return hasCosts
        ? copy.totals.verdictMissingIncome
        : copy.totals.verdictEmpty;
  }
}

function recurringAppliesToMonth(
  startsOn: Date,
  endsOn: Date | null,
  monthStart: Date,
  monthEnd: Date,
): boolean {
  if (startsOn > monthEnd) {
    return false;
  }
  if (endsOn && endsOn < monthStart) {
    return false;
  }
  return true;
}

function buildVariableEstimateStatus(estimate: number | null): string {
  if (estimate === null || estimate <= 0) {
    return "Sem estimativa de variáveis";
  }
  return "Estimativa mensal de gastos variáveis";
}
