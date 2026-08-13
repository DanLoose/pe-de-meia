import { futureCashDeltaByDate } from "@/lib/horizon-cash";
import type { HorizonRuleInput } from "@/lib/horizon-recurring";
import {
  buildOpenInvoiceRunningByDate,
  mapaCardLookbackStart,
  type CardChargePoint,
} from "@/lib/mapa-card-invoice";
import {
  buildInvoiceStory,
  buildMapaDaySnapshots,
  findNextCrunch,
  monthDayDates,
  primaryPaydayDates,
  projectBalanceRange,
  projectedCashCausesForDate,
  projectedCashNetForDate,
  summarizeMonthHeat,
  type MapaCashCause,
} from "@/lib/mapa-snapshot";
import { cashDelta } from "@/lib/cash";
import { formatDateOnly, getMonthDateRange, parseDateOnly } from "@/lib/dates";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import { prisma } from "@/lib/db";
import {
  ensureCardAccount,
  ensureCardInvoices,
  getCardPurchaseCharges,
} from "@/lib/services/card";
import {
  getLedgerMonth,
  getUserOpeningBalance,
} from "@/lib/services/ledger";
import { ensureRecurringTransactions } from "@/lib/services/recurring";
import type { MapaMonthSnapshot, MapaYearMonthHeat } from "@/types";

const DEFAULT_LOW_THRESHOLD = 500;

async function getRecurringRules(userId: string): Promise<HorizonRuleInput[]> {
  const rules = await prisma.recurringTransaction.findMany({
    where: { userId, active: true },
    include: { category: true },
  });

  return rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    amount: Number(rule.amount),
    description: rule.description,
    dayOfMonth: rule.dayOfMonth,
    startsOn: formatDateOnly(rule.startsOn),
    endsOn: rule.endsOn ? formatDateOnly(rule.endsOn) : null,
    categoryName: rule.category.name,
    categoryLedgerColumn: rule.ledgerColumn,
  }));
}

async function resolveTodayBalance(
  userId: string,
  today: string,
): Promise<number> {
  const [year, month] = today.split("-").map(Number);
  const ledger = await getLedgerMonth(userId, year, month);
  const todayRow = ledger.rows.find((row) => row.date === today);
  if (todayRow) return todayRow.balance;

  let balance = await getUserOpeningBalance(userId);
  const pastTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { lte: parseDateOnly(today) },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  for (const tx of pastTransactions) {
    const column = resolveLedgerColumn(
      tx.ledgerColumn,
      tx.category.ledgerColumn,
    );
    balance += cashDelta(column, Number(tx.amount), tx.affectsBalance);
  }
  return Math.round(balance * 100) / 100;
}

/**
 * Month snapshot for Mapa financeiro.
 * Past/today balances from ledger; future days via projectBalanceRange
 * (recurrings + card invoice payments — no variable-estimate burn).
 */
export async function getMapaMonthSnapshot(
  userId: string,
  year: number,
  month: number,
  today: string,
  {
    lowThreshold = DEFAULT_LOW_THRESHOLD,
  }: { lowThreshold?: number } = {},
): Promise<MapaMonthSnapshot> {
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month);
  const monthStartStr = formatDateOnly(monthStart);
  const monthEndStr = formatDateOnly(monthEnd);
  const dayDates = monthDayDates(year, month);

  const cardAccount = await ensureCardAccount(userId);
  const closingDay = cardAccount.closingDay;
  const dueDay = cardAccount.dueDay;

  const ensureFrom = today < monthStartStr ? today : monthStartStr;
  const ensureTo = today > monthEndStr ? today : monthEndStr;

  await ensureRecurringTransactions(userId, ensureFrom, ensureTo);
  await ensureCardInvoices(userId, ensureFrom, ensureTo);

  const lookbackStart = mapaCardLookbackStart(
    year,
    month,
    closingDay,
    dueDay,
  );
  const chargeEnd = today > monthEndStr ? today : monthEndStr;
  const charges: CardChargePoint[] = await getCardPurchaseCharges(
    userId,
    lookbackStart,
    chargeEnd,
  );

  const [ledger, rules] = await Promise.all([
    getLedgerMonth(userId, year, month),
    getRecurringRules(userId),
  ]);

  const [todayYear, todayMonth] = today.split("-").map(Number);
  const todayBalance =
    todayYear === year && todayMonth === month
      ? (ledger.rows.find((row) => row.date === today)?.balance ??
        ledger.openingBalance)
      : await resolveTodayBalance(userId, today);

  const ledgerByDate = new Map(
    ledger.rows.map((row) => [row.date, row] as const),
  );

  const rangeTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: parseDateOnly(today < monthStartStr ? today : monthStartStr),
        lte: parseDateOnly(ensureTo),
      },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const futureCashTxs = rangeTxs.filter(
    (tx) => formatDateOnly(tx.date) > today && tx.affectsBalance,
  );

  const cashDeltaByDate = futureCashDeltaByDate(
    futureCashTxs.map((tx) => ({
      date: formatDateOnly(tx.date),
      amount: Number(tx.amount),
      ledgerColumn: tx.ledgerColumn,
      categoryLedgerColumn: tx.category.ledgerColumn,
      affectsBalance: tx.affectsBalance,
      recurringId: tx.recurringId,
    })),
  );

  const oneOffCausesByDate = new Map<string, MapaCashCause[]>();
  for (const tx of futureCashTxs) {
    if (tx.recurringId) continue;
    const dateStr = formatDateOnly(tx.date);
    const column = resolveLedgerColumn(
      tx.ledgerColumn,
      tx.category.ledgerColumn,
    );
    const delta = cashDelta(column, Number(tx.amount), tx.affectsBalance);
    if (delta === 0) continue;
    const list = oneOffCausesByDate.get(dateStr) ?? [];
    list.push({
      label: tx.description?.trim() || tx.category.name,
      cashDelta: delta,
    });
    oneOffCausesByDate.set(dateStr, list);
  }

  const projectedEnd = monthEndStr > today ? monthEndStr : today;
  const projected = projectBalanceRange({
    today,
    todayBalance,
    endDate: projectedEnd,
    rules,
    cashDeltaByDate,
  });

  const balanceByDate = new Map<string, number>();
  const cashNetByDate = new Map<string, number>();
  const causesByDate = new Map<string, MapaCashCause[]>();

  let prevBalance: number | null = null;
  for (const date of dayDates) {
    if (date <= today) {
      const row = ledgerByDate.get(date);
      const balance: number =
        row?.balance ?? (prevBalance ?? ledger.openingBalance);
      balanceByDate.set(date, balance);
      const cashNet =
        prevBalance === null
          ? balance - ledger.openingBalance
          : balance - prevBalance;
      cashNetByDate.set(date, Math.round(cashNet * 100) / 100);

      const dayCauses: MapaCashCause[] = [];
      for (const tx of rangeTxs) {
        if (formatDateOnly(tx.date) !== date) continue;
        if (!tx.affectsBalance) continue;
        const column = resolveLedgerColumn(
          tx.ledgerColumn,
          tx.category.ledgerColumn,
        );
        const delta = cashDelta(column, Number(tx.amount), tx.affectsBalance);
        if (delta === 0) continue;
        dayCauses.push({
          label: tx.description?.trim() || tx.category.name,
          cashDelta: delta,
        });
      }
      causesByDate.set(date, dayCauses);
      prevBalance = balance;
    } else {
      const balance: number =
        projected.get(date) ?? prevBalance ?? todayBalance;
      balanceByDate.set(date, balance);
      cashNetByDate.set(
        date,
        projectedCashNetForDate(rules, date, cashDeltaByDate),
      );
      causesByDate.set(
        date,
        projectedCashCausesForDate(
          rules,
          date,
          oneOffCausesByDate.get(date) ?? [],
        ),
      );
      prevBalance = balance;
    }
  }

  const openInvoiceByDate = buildOpenInvoiceRunningByDate(
    dayDates,
    charges,
    closingDay,
    dueDay,
  );

  const paydayDates = primaryPaydayDates(rules, dayDates);

  const days = buildMapaDaySnapshots({
    dayDates,
    balanceByDate,
    cashNetByDate,
    openInvoiceByDate,
    closingDay,
    dueDay,
    paydayDates,
  });

  const asOfForInvoice =
    today >= monthStartStr && today <= monthEndStr
      ? today
      : today < monthStartStr
        ? monthStartStr
        : monthEndStr;

  const invoiceStory = buildInvoiceStory({
    asOfDate: asOfForInvoice,
    year,
    month,
    closingDay,
    dueDay,
    charges,
  });

  const nextCrunch = findNextCrunch({
    today,
    days,
    causesByDate,
    lowThreshold,
  });

  return {
    year,
    month,
    today,
    lowThreshold,
    days,
    cards: {
      todayBalance,
      nextCrunch,
      invoiceStory,
    },
  };
}

/**
 * Year overlay / J–D pill heat: balance bands only.
 * Skips open-invoice, crunch, and invoice-story work from full month snapshots.
 */
export async function getMapaYearHeat(
  userId: string,
  year: number,
  today: string,
  {
    lowThreshold = DEFAULT_LOW_THRESHOLD,
  }: { lowThreshold?: number } = {},
): Promise<MapaYearMonthHeat[]> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const ensureFrom = today < yearStart ? today : yearStart;
  const ensureTo = today > yearEnd ? today : yearEnd;
  const [todayYear, todayMonth] = today.split("-").map(Number);

  await Promise.all([
    ensureRecurringTransactions(userId, ensureFrom, ensureTo),
    ensureCardInvoices(userId, ensureFrom, ensureTo),
  ]);

  const needsProjection = yearEnd > today;

  const ledgerMonths = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // Fully future months have no past/today days — skip ledger.
    if (year > todayYear || (year === todayYear && month > todayMonth)) {
      return Promise.resolve(null);
    }
    return getLedgerMonth(userId, year, month);
  });

  const [rules, todayBalance, futureTxs, ...ledgers] = await Promise.all([
    getRecurringRules(userId),
    resolveTodayBalance(userId, today),
    needsProjection
      ? prisma.transaction.findMany({
          where: {
            userId,
            date: {
              gt: parseDateOnly(today),
              lte: parseDateOnly(ensureTo),
            },
            affectsBalance: true,
          },
          include: { category: true },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    ...ledgerMonths,
  ]);

  const cashDeltaByDate = futureCashDeltaByDate(
    futureTxs.map((tx) => ({
      date: formatDateOnly(tx.date),
      amount: Number(tx.amount),
      ledgerColumn: tx.ledgerColumn,
      categoryLedgerColumn: tx.category.ledgerColumn,
      affectsBalance: tx.affectsBalance,
      recurringId: tx.recurringId,
    })),
  );

  const projected = needsProjection
    ? projectBalanceRange({
        today,
        todayBalance,
        endDate: yearEnd,
        rules,
        cashDeltaByDate,
      })
    : new Map<string, number>();

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const ledger = ledgers[i];
    const dayDates = monthDayDates(year, month);
    const ledgerByDate = new Map(
      ledger?.rows.map((row) => [row.date, row] as const) ?? [],
    );

    const days: Array<{ balance: number }> = [];
    let prevBalance: number | null = null;

    for (const date of dayDates) {
      if (date <= today) {
        const row = ledgerByDate.get(date);
        const balance: number =
          row?.balance ?? (prevBalance ?? ledger?.openingBalance ?? todayBalance);
        days.push({ balance });
        prevBalance = balance;
      } else {
        const balance: number =
          projected.get(date) ?? prevBalance ?? todayBalance;
        days.push({ balance });
        prevBalance = balance;
      }
    }

    const heat = summarizeMonthHeat(days, lowThreshold);
    return { month, band: heat.band, hasRed: heat.hasRed };
  });
}
