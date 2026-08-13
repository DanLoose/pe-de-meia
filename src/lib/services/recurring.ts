import { Prisma } from "@/generated/prisma/client";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { defaultAffectsBalance } from "@/lib/cash";
import {
  defaultRecurringStartsOn,
  formatDateOnly,
  parseDateOnly,
} from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { resolveCardInvoiceId } from "@/lib/services/card";
import {
  createRecurringSchema,
  deleteRecurringSchema,
  updateRecurringSchema,
} from "@/lib/validators/recurring";
import type { RecurringTransactionDTO } from "@/types";

function todayDateOnly() {
  return format(new Date(), "yyyy-MM-dd");
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function resolveStartsOn(dayOfMonth: number, startsOn?: string): Date {
  return startsOn ? parseDateOnly(startsOn) : defaultRecurringStartsOn(dayOfMonth);
}

function resolveEndsOn(endsOn?: string | null): Date | null {
  return endsOn ? parseDateOnly(endsOn) : null;
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
    startsOn: formatDateOnly(recurring.startsOn),
    endsOn: recurring.endsOn ? formatDateOnly(recurring.endsOn) : null,
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
      startsOn: resolveStartsOn(data.dayOfMonth, data.startsOn),
      endsOn: resolveEndsOn(data.endsOn),
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
      ...(data.startsOn !== undefined
        ? { startsOn: resolveStartsOn(data.dayOfMonth, data.startsOn) }
        : {}),
      ...(data.endsOn !== undefined ? { endsOn: resolveEndsOn(data.endsOn) } : {}),
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

  const today = todayDateOnly();

  await prisma.$transaction([
    prisma.transaction.deleteMany({
      where: {
        userId,
        recurringId: data.id,
        date: { gte: parseDateOnly(today) },
      },
    }),
    prisma.recurringTransaction.delete({ where: { id: data.id } }),
  ]);
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

  // Never backfill days before today. Otherwise deleting a past occurrence
  // (e.g. "só este dia" in Projeção) is recreated on the next ledger/horizon load.
  const today = parseDateOnly(todayDateOnly());
  const requestedStart = parseDateOnly(startDate);
  const start = requestedStart < today ? today : requestedStart;
  const end = parseDateOnly(endDate);

  if (start > end) {
    return;
  }

  for (const rule of rules) {
    const ruleStart = rule.startsOn;
    const ruleEnd = rule.endsOn;
    const effectiveStart = ruleStart > start ? ruleStart : start;
    const effectiveEnd = ruleEnd && ruleEnd < end ? ruleEnd : end;

    if (effectiveStart > effectiveEnd) {
      continue;
    }

    let year = effectiveStart.getUTCFullYear();
    let month = effectiveStart.getUTCMonth();

    const endYear = effectiveEnd.getUTCFullYear();
    const endMonth = effectiveEnd.getUTCMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(rule.dayOfMonth, lastDay);
      const date = new Date(Date.UTC(year, month, day));

      if (date >= effectiveStart && date <= effectiveEnd) {
        const existing = await prisma.transaction.findFirst({
          where: { recurringId: rule.id, date },
        });

        if (!existing) {
          const ledgerColumn = resolveLedgerColumn(
            null,
            rule.category.ledgerColumn,
          );
          const cardInvoiceId = await resolveCardInvoiceId(
            userId,
            ledgerColumn,
            date,
          );

          await prisma.transaction.create({
            data: {
              userId,
              categoryId: rule.categoryId,
              type: rule.type,
              amount: rule.amount,
              description: rule.description,
              date,
              recurringId: rule.id,
              ledgerColumn,
              affectsBalance: defaultAffectsBalance(ledgerColumn),
              cardInvoiceId,
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

  const today = todayDateOnly();

  const recurring = await prisma.$transaction(async (tx) => {
    if (!active) {
      await tx.transaction.deleteMany({
        where: {
          userId,
          recurringId: id,
          date: { gt: parseDateOnly(today) },
        },
      });
    }

    return tx.recurringTransaction.update({
      where: { id },
      data: { active },
      include: { category: true },
    });
  });

  return toRecurringDTO(recurring);
}
