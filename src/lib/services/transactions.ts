import { Prisma, TransactionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  createTransactionSchema,
  dateRangeQuerySchema,
  deleteTransactionSchema,
  monthQuerySchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "@/lib/validators/transaction";
import type { DailySummary, MonthData, TransactionDTO } from "@/types";
import { getBudgetSummaryForRange } from "@/lib/services/budgets";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import {
  formatDateOnly,
  getMonthDateRange,
  parseDateOnly,
} from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";

function toNumber(value: Prisma.Decimal): number {
  return Number(value.toString());
}

function toTransactionDTO(
  transaction: Prisma.TransactionGetPayload<{ include: { category: true } }>,
): TransactionDTO {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: toNumber(transaction.amount),
    description: transaction.description,
    date: formatDateOnly(transaction.date),
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    categoryColor: transaction.category.color,
    recurringId: transaction.recurringId,
    ledgerColumn: resolveLedgerColumn(
      transaction.ledgerColumn,
      transaction.category.ledgerColumn,
    ),
  };
}

function buildDailySummaries(transactions: TransactionDTO[]): DailySummary[] {
  const summaryMap = new Map<string, DailySummary>();

  for (const transaction of transactions) {
    const existing = summaryMap.get(transaction.date) ?? {
      date: transaction.date,
      incomeTotal: 0,
      expenseTotal: 0,
      net: 0,
    };

    if (transaction.type === "INCOME") {
      existing.incomeTotal += transaction.amount;
    } else {
      existing.expenseTotal += transaction.amount;
    }

    existing.net = existing.incomeTotal - existing.expenseTotal;
    summaryMap.set(transaction.date, existing);
  }

  return Array.from(summaryMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

function getMonthRange(year: number, month: number) {
  return getMonthDateRange(year, month);
}

async function assertCategoryOwnership(
  userId: string,
  categoryId: string,
  type: TransactionType,
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, type },
  });

  if (!category) {
    throw new Error("Invalid category for this transaction type");
  }
}

export async function getTransactionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<MonthData> {
  const parsed = monthQuerySchema.parse({ year, month });
  const { start, end } = getMonthRange(parsed.year, parsed.month);

  return getTransactionsInRange(userId, start, end);
}

export async function getTransactionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<MonthData> {
  const parsed = dateRangeQuerySchema.parse({ start: startDate, end: endDate });
  const start = parseDateOnly(parsed.start);
  const end = parseDateOnly(parsed.end);

  return getTransactionsInRange(userId, start, end);
}

async function getTransactionsInRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<MonthData> {
  const startDate = formatDateOnly(start);
  const endDate = formatDateOnly(end);

  await ensureRecurringTransactions(userId, startDate, endDate);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const events = transactions.map(toTransactionDTO);
  const dailySummaries = buildDailySummaries(events);
  const expenseTotal = dailySummaries.reduce(
    (sum, summary) => sum + summary.expenseTotal,
    0,
  );
  const budgetSummary = await getBudgetSummaryForRange(
    userId,
    startDate,
    endDate,
    expenseTotal,
  );

  return {
    events,
    dailySummaries,
    budgetSummary,
  };
}

export async function getTransactionsByDate(
  userId: string,
  date: string,
): Promise<TransactionDTO[]> {
  const parsedDate = createTransactionSchema.shape.date.parse(date);
  const day = parseDateOnly(parsedDate);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: day },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });

  return transactions.map(toTransactionDTO);
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDTO> {
  const data = createTransactionSchema.parse(input);
  await assertCategoryOwnership(userId, data.categoryId, data.type);

  const date = parseDateOnly(data.date);
  const description = data.description?.trim() || null;

  if (data.recurring) {
    const dayOfMonth = date.getUTCDate();

    const transaction = await prisma.$transaction(async (tx) => {
      const recurring = await tx.recurringTransaction.create({
        data: {
          userId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description,
          dayOfMonth,
        },
      });

      return tx.transaction.create({
        data: {
          userId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description,
          date,
          recurringId: recurring.id,
          ledgerColumn: data.ledgerColumn,
        },
        include: { category: true },
      });
    });

    return toTransactionDTO(transaction);
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      description,
      date,
      ledgerColumn: data.ledgerColumn,
    },
    include: { category: true },
  });

  return toTransactionDTO(transaction);
}

export async function updateTransaction(
  userId: string,
  input: UpdateTransactionInput,
): Promise<TransactionDTO> {
  const data = updateTransactionSchema.parse(input);

  const existing = await prisma.transaction.findFirst({
    where: { id: data.id, userId },
  });

  if (!existing) {
    throw new Error("Transaction not found");
  }

  await assertCategoryOwnership(userId, data.categoryId, data.type);

  const date = parseDateOnly(data.date);
  const description = data.description?.trim() || null;

  const transaction = await prisma.$transaction(async (tx) => {
    let recurringId = existing.recurringId;

    if (data.recurring === true && !recurringId) {
      const recurring = await tx.recurringTransaction.create({
        data: {
          userId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description,
          dayOfMonth: date.getUTCDate(),
        },
      });
      recurringId = recurring.id;
    }

    if (data.recurring === false && recurringId) {
      await tx.recurringTransaction.delete({ where: { id: recurringId } });
      recurringId = null;
    }

    return tx.transaction.update({
      where: { id: data.id },
      data: {
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        description,
        date,
        recurringId,
      },
      include: { category: true },
    });
  });

  return toTransactionDTO(transaction);
}

export async function deleteTransaction(
  userId: string,
  id: string,
): Promise<void> {
  const data = deleteTransactionSchema.parse({ id });

  const existing = await prisma.transaction.findFirst({
    where: { id: data.id, userId },
  });

  if (!existing) {
    throw new Error("Transaction not found");
  }

  await prisma.transaction.delete({ where: { id: data.id } });
}
