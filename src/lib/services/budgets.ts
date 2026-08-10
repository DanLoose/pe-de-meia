import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { upsertBudgetSchema } from "@/lib/validators/budget";
import type { CategoryBudgetDTO } from "@/types";

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

export async function getBudgetsForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<CategoryBudgetDTO[]> {
  const budgets = await prisma.categoryBudget.findMany({
    where: { userId, year, month },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
  });

  return budgets.map((budget) => ({
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryColor: budget.category.color,
    categoryType: budget.category.type,
    year: budget.year,
    month: budget.month,
    amount: toNumber(budget.amount),
  }));
}

export async function upsertCategoryBudget(
  userId: string,
  input: unknown,
): Promise<CategoryBudgetDTO> {
  const data = upsertBudgetSchema.parse(input);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new Error("Categoria não encontrada");
  }

  const budget = await prisma.categoryBudget.upsert({
    where: {
      userId_categoryId_year_month: {
        userId,
        categoryId: data.categoryId,
        year: data.year,
        month: data.month,
      },
    },
    create: {
      userId,
      categoryId: data.categoryId,
      year: data.year,
      month: data.month,
      amount: data.amount,
    },
    update: {
      amount: data.amount,
    },
    include: { category: true },
  });

  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryColor: budget.category.color,
    categoryType: budget.category.type,
    year: budget.year,
    month: budget.month,
    amount: toNumber(budget.amount),
  };
}

export async function getBudgetSummaryForRange(
  userId: string,
  startDate: string,
  endDate: string,
  expenseTotal: number,
): Promise<{ budgetTotal: number; expenseTotal: number } | null> {
  const months = getMonthsInRange(startDate, endDate);
  if (months.length === 0) {
    return null;
  }

  const budgets = await prisma.categoryBudget.findMany({
    where: {
      userId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    include: { category: true },
  });

  const budgetTotal = budgets
    .filter((budget) => budget.category.type === "EXPENSE")
    .reduce((sum, budget) => sum + toNumber(budget.amount), 0);

  if (budgetTotal <= 0) {
    return null;
  }

  return { budgetTotal, expenseTotal };
}

function getMonthsInRange(
  startDate: string,
  endDate: string,
): Array<{ year: number; month: number }> {
  const [startYear, startMonth] = startDate.split("-").map(Number);
  const [endYear, endMonth] = endDate.split("-").map(Number);
  const months: Array<{ year: number; month: number }> = [];

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}
