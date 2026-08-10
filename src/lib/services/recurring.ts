import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import {
  createRecurringSchema,
  deleteRecurringSchema,
  updateRecurringSchema,
} from "@/lib/validators/recurring";
import type { RecurringTransactionDTO } from "@/types";

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function toRecurringDTO(
  recurring: Prisma.RecurringTransactionGetPayload<{ include: { category: true } }>,
): RecurringTransactionDTO {
  return {
    id: recurring.id,
    type: recurring.type,
    amount: toNumber(recurring.amount),
    description: recurring.description,
    dayOfMonth: recurring.dayOfMonth,
    active: recurring.active,
    categoryId: recurring.categoryId,
    categoryName: recurring.category.name,
    categoryColor: recurring.category.color,
  };
}

export async function getRecurringByUser(
  userId: string,
): Promise<RecurringTransactionDTO[]> {
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
  });

  return items.map(toRecurringDTO);
}

export async function createRecurring(
  userId: string,
  input: unknown,
): Promise<RecurringTransactionDTO> {
  const data = createRecurringSchema.parse(input);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId, type: data.type },
  });
  if (!category) {
    throw new Error("Categoria inválida para este tipo");
  }

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description?.trim() || null,
      dayOfMonth: data.dayOfMonth,
    },
    include: { category: true },
  });

  return toRecurringDTO(recurring);
}

export async function updateRecurring(
  userId: string,
  input: unknown,
): Promise<RecurringTransactionDTO> {
  const data = updateRecurringSchema.parse(input);

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: data.id, userId },
  });
  if (!existing) {
    throw new Error("Recorrência não encontrada");
  }

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId, type: data.type },
  });
  if (!category) {
    throw new Error("Categoria inválida para este tipo");
  }

  const recurring = await prisma.recurringTransaction.update({
    where: { id: data.id },
    data: {
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description: data.description?.trim() || null,
      dayOfMonth: data.dayOfMonth,
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
    include: { category: true },
  });

  return toRecurringDTO(recurring);
}

export async function deleteRecurring(userId: string, id: string): Promise<void> {
  const data = deleteRecurringSchema.parse({ id });

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: data.id, userId },
  });
  if (!existing) {
    throw new Error("Recorrência não encontrada");
  }

  await prisma.recurringTransaction.delete({ where: { id: data.id } });
}

export async function ensureRecurringTransactions(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const rules = await prisma.recurringTransaction.findMany({
    where: { userId, active: true },
    include: { category: true },
  });

  if (rules.length === 0) {
    return;
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  for (const rule of rules) {
    let year = start.getUTCFullYear();
    let month = start.getUTCMonth();

    const endYear = end.getUTCFullYear();
    const endMonth = end.getUTCMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(rule.dayOfMonth, lastDay);
      const date = new Date(Date.UTC(year, month, day));

      if (date >= start && date <= end) {
        const existing = await prisma.transaction.findFirst({
          where: { recurringId: rule.id, date },
        });

        if (!existing) {
          await prisma.transaction.create({
            data: {
              userId,
              categoryId: rule.categoryId,
              type: rule.type,
              amount: rule.amount,
              description: rule.description,
              date,
              recurringId: rule.id,
            },
          });
        }
      }

      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }
}

export async function toggleRecurringActive(
  userId: string,
  id: string,
  active: boolean,
): Promise<RecurringTransactionDTO> {
  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Recorrência não encontrada");
  }

  const recurring = await prisma.recurringTransaction.update({
    where: { id },
    data: { active },
    include: { category: true },
  });

  return toRecurringDTO(recurring);
}
