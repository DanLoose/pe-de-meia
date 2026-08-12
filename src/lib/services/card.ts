import {
  DEFAULT_CARD_CLOSING_DAY,
  DEFAULT_CARD_DUE_DAY,
  cardPaymentDescription,
  invoiceCycleForPurchase,
} from "@/lib/card-cycle";
import { prisma } from "@/lib/db";
import { parseDateOnly, utcToday } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import type { LedgerColumn } from "@/types";

export const CARD_PAYMENT_CATEGORY_NAME = "Fatura";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

const cardPurchaseWhere = {
  OR: [
    { ledgerColumn: "CARD" as const },
    { ledgerColumn: null, category: { ledgerColumn: "CARD" as const } },
  ],
};

export async function ensureCardAccount(userId: string) {
  const existing = await prisma.cardAccount.findUnique({
    where: { userId },
  });
  if (existing) {
    return existing;
  }

  try {
    return await prisma.cardAccount.create({
      data: {
        userId,
        closingDay: DEFAULT_CARD_CLOSING_DAY,
        dueDay: DEFAULT_CARD_DUE_DAY,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return prisma.cardAccount.findUniqueOrThrow({ where: { userId } });
    }
    throw error;
  }
}

export async function ensureCardPaymentCategory(userId: string) {
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: CARD_PAYMENT_CATEGORY_NAME,
      type: "EXPENSE",
    },
  });

  if (existing) {
    if (existing.ledgerColumn !== "CARD") {
      return prisma.category.update({
        where: { id: existing.id },
        data: { ledgerColumn: "CARD" },
      });
    }
    return existing;
  }

  try {
    return await prisma.category.create({
      data: {
        userId,
        name: CARD_PAYMENT_CATEGORY_NAME,
        color: "#6366f1",
        type: "EXPENSE",
        ledgerColumn: "CARD",
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return prisma.category.findFirstOrThrow({
        where: {
          userId,
          name: CARD_PAYMENT_CATEGORY_NAME,
          type: "EXPENSE",
        },
      });
    }
    throw error;
  }
}

export async function resolveInvoiceForPurchase(
  userId: string,
  purchaseDate: Date,
) {
  const account = await ensureCardAccount(userId);
  const cycle = invoiceCycleForPurchase(
    purchaseDate,
    account.closingDay,
    account.dueDay,
  );

  return prisma.cardInvoice.upsert({
    where: {
      cardAccountId_cycleEnd: {
        cardAccountId: account.id,
        cycleEnd: cycle.cycleEnd,
      },
    },
    create: {
      userId,
      cardAccountId: account.id,
      cycleStart: cycle.cycleStart,
      cycleEnd: cycle.cycleEnd,
      dueDate: cycle.dueDate,
      status: "OPEN",
    },
    update: {},
  });
}

export async function resolveCardInvoiceId(
  userId: string,
  ledgerColumn: LedgerColumn,
  purchaseDate: Date,
): Promise<string | null> {
  if (ledgerColumn !== "CARD") {
    return null;
  }

  const invoice = await resolveInvoiceForPurchase(userId, purchaseDate);
  return invoice.id;
}

export async function isCardPaymentTransaction(
  transactionId: string,
): Promise<boolean> {
  const invoice = await prisma.cardInvoice.findUnique({
    where: { paymentTransactionId: transactionId },
    select: { id: true },
  });
  return invoice !== null;
}

async function paymentTransactionIds(userId: string): Promise<string[]> {
  const invoices = await prisma.cardInvoice.findMany({
    where: { userId, paymentTransactionId: { not: null } },
    select: { paymentTransactionId: true },
  });
  return invoices
    .map((invoice) => invoice.paymentTransactionId)
    .filter((id): id is string => Boolean(id));
}

async function backfillCardPurchaseFlags(userId: string): Promise<void> {
  const paymentIds = await paymentTransactionIds(userId);
  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      affectsBalance: true,
      ...(paymentIds.length > 0 ? { id: { notIn: paymentIds } } : {}),
      ...cardPurchaseWhere,
    },
    include: { category: true },
  });

  const purchaseIds = candidates
    .filter(
      (tx) =>
        resolveLedgerColumn(tx.ledgerColumn, tx.category.ledgerColumn) ===
        "CARD",
    )
    .map((tx) => tx.id);

  if (purchaseIds.length === 0) {
    return;
  }

  await prisma.transaction.updateMany({
    where: { id: { in: purchaseIds } },
    data: { affectsBalance: false },
  });
}

export async function attachMissingCardInvoices(userId: string): Promise<void> {
  await ensureCardAccount(userId);

  const purchases = await prisma.transaction.findMany({
    where: {
      userId,
      cardInvoiceId: null,
      affectsBalance: false,
      ...cardPurchaseWhere,
    },
    include: { category: true },
  });

  for (const tx of purchases) {
    const column = resolveLedgerColumn(
      tx.ledgerColumn,
      tx.category.ledgerColumn,
    );
    if (column !== "CARD") {
      continue;
    }

    const invoice = await resolveInvoiceForPurchase(userId, tx.date);
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { cardInvoiceId: invoice.id },
    });
  }
}

async function closeEndedInvoices(userId: string): Promise<void> {
  await prisma.cardInvoice.updateMany({
    where: {
      userId,
      status: "OPEN",
      cycleEnd: { lt: utcToday() },
      paymentTransactionId: null,
    },
    data: { status: "CLOSED" },
  });
}

async function syncInvoicePayment(
  userId: string,
  invoiceId: string,
  categoryId: string,
): Promise<void> {
  const invoice = await prisma.cardInvoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      purchases: {
        where: { affectsBalance: false },
      },
    },
  });

  if (!invoice) {
    return;
  }

  const total = invoice.purchases.reduce(
    (sum, purchase) => sum + Number(purchase.amount),
    0,
  );
  const description = cardPaymentDescription(invoice.dueDate);
  const ended = invoice.cycleEnd < utcToday();

  if (total <= 0) {
    if (invoice.paymentTransactionId) {
      await prisma.transaction.delete({
        where: { id: invoice.paymentTransactionId },
      });
    }
    await prisma.cardInvoice.update({
      where: { id: invoice.id },
      data: {
        paymentTransactionId: null,
        status: ended ? "CLOSED" : "OPEN",
      },
    });
    return;
  }

  if (invoice.paymentTransactionId) {
    await prisma.transaction.update({
      where: { id: invoice.paymentTransactionId },
      data: {
        categoryId,
        amount: total,
        description,
        date: invoice.dueDate,
        ledgerColumn: "CARD",
        affectsBalance: true,
        cardInvoiceId: null,
      },
    });
    await prisma.cardInvoice.update({
      where: { id: invoice.id },
      data: { status: "PAID" },
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const payment = await tx.transaction.create({
      data: {
        userId,
        categoryId,
        type: "EXPENSE",
        amount: total,
        description,
        date: invoice.dueDate,
        ledgerColumn: "CARD",
        affectsBalance: true,
      },
    });

    await tx.cardInvoice.update({
      where: { id: invoice.id },
      data: {
        paymentTransactionId: payment.id,
        status: "PAID",
      },
    });
  });
}

export async function ensureCardInvoicePayments(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<void> {
  const category = await ensureCardPaymentCategory(userId);
  const invoices = await prisma.cardInvoice.findMany({
    where: {
      userId,
      dueDate: { gte: startDate, lte: endDate },
    },
    select: { id: true },
  });

  for (const invoice of invoices) {
    await syncInvoicePayment(userId, invoice.id, category.id);
  }
}

export async function ensureCardInvoices(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  await ensureCardAccount(userId);
  await backfillCardPurchaseFlags(userId);
  await attachMissingCardInvoices(userId);
  await closeEndedInvoices(userId);
  await ensureCardInvoicePayments(
    userId,
    parseDateOnly(startDate),
    parseDateOnly(endDate),
  );
}

export async function updateCardAccount(
  userId: string,
  input: { closingDay: number; dueDay: number },
) {
  const account = await ensureCardAccount(userId);
  return prisma.cardAccount.update({
    where: { id: account.id },
    data: {
      closingDay: input.closingDay,
      dueDay: input.dueDay,
    },
  });
}
