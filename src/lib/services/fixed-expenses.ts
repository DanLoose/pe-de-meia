import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { DailyForecastData, FixedExpenseDTO } from "@/types";

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function toFixedExpenseDTO(expense: {
  id: string;
  name: string;
  amount: Prisma.Decimal;
  sortOrder: number;
}): FixedExpenseDTO {
  return {
    id: expense.id,
    name: expense.name,
    amount: toNumber(expense.amount),
    sortOrder: expense.sortOrder,
  };
}

export async function getFixedExpensesByUser(
  userId: string,
): Promise<FixedExpenseDTO[]> {
  const items = await prisma.fixedMonthlyExpense.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return items.map(toFixedExpenseDTO);
}

export async function getDailyCeiling(userId: string): Promise<{
  dailyDivisor: number;
  totalFixed: number;
  dailyCeiling: number | null;
}> {
  const [user, expenses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { dailyDivisor: true },
    }),
    getFixedExpensesByUser(userId),
  ]);

  const dailyDivisor = user?.dailyDivisor ?? 30;
  const totalFixed = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (totalFixed <= 0 || dailyDivisor <= 0) {
    return { dailyDivisor, totalFixed, dailyCeiling: null };
  }

  return {
    dailyDivisor,
    totalFixed,
    dailyCeiling: totalFixed / dailyDivisor,
  };
}

export async function getDailyForecast(
  userId: string,
): Promise<DailyForecastData> {
  const [expenses, ceiling] = await Promise.all([
    getFixedExpensesByUser(userId),
    getDailyCeiling(userId),
  ]);

  return {
    expenses,
    dailyDivisor: ceiling.dailyDivisor,
    totalFixed: ceiling.totalFixed,
    dailyCeiling: ceiling.dailyCeiling ?? 0,
  };
}

export async function createFixedExpense(
  userId: string,
  input: { name: string; amount: number },
): Promise<FixedExpenseDTO> {
  const count = await prisma.fixedMonthlyExpense.count({ where: { userId } });
  const expense = await prisma.fixedMonthlyExpense.create({
    data: {
      userId,
      name: input.name.trim(),
      amount: input.amount,
      sortOrder: count,
    },
  });
  return toFixedExpenseDTO(expense);
}

export async function updateFixedExpense(
  userId: string,
  input: { id: string; name: string; amount: number },
): Promise<FixedExpenseDTO> {
  const existing = await prisma.fixedMonthlyExpense.findFirst({
    where: { id: input.id, userId },
  });
  if (!existing) {
    throw new Error("Gasto fixo não encontrado");
  }

  const expense = await prisma.fixedMonthlyExpense.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      amount: input.amount,
    },
  });
  return toFixedExpenseDTO(expense);
}

export async function deleteFixedExpense(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.fixedMonthlyExpense.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Gasto fixo não encontrado");
  }
  await prisma.fixedMonthlyExpense.delete({ where: { id } });
}

export async function updateDailyDivisor(
  userId: string,
  dailyDivisor: number,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { dailyDivisor },
  });
}
