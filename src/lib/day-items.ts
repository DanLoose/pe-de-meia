import type { CommitmentMapEvent } from "@/lib/commitment-map";
import { payModeFromLedgerColumn } from "@/lib/commitment-map";
import { defaultAffectsBalance } from "@/lib/cash";
import type { TransactionDTO, TransactionType } from "@/types";

export type DayItemStatus = "pending" | "done";

export interface MergedPlanItem {
  kind: "plan";
  status: DayItemStatus;
  event: CommitmentMapEvent;
  transaction: TransactionDTO | null;
}

export interface MergedExtraItem {
  kind: "extra";
  transaction: TransactionDTO;
}

export type MergedDayItem = MergedPlanItem | MergedExtraItem;

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function labelsMatch(a: string, b: string | null) {
  if (!b) return false;
  return normalizeLabel(a) === normalizeLabel(b);
}

function findMatchingTransaction(
  event: CommitmentMapEvent,
  txs: TransactionDTO[],
  used: Set<string>,
): TransactionDTO | null {
  const byRule = txs.find(
    (tx) =>
      !used.has(tx.id) &&
      tx.recurringId === event.ruleId &&
      tx.type === event.type,
  );
  if (byRule) return byRule;

  return (
    txs.find(
      (tx) =>
        !used.has(tx.id) &&
        !tx.recurringId &&
        tx.type === event.type &&
        tx.amount === event.amount &&
        labelsMatch(event.label, tx.description),
    ) ?? null
  );
}

/** Unifica plano + lançamentos: um item por compromisso, avulsos à parte. */
export function mergeDayItems(
  events: CommitmentMapEvent[],
  transactions: TransactionDTO[],
): MergedDayItem[] {
  const used = new Set<string>();
  const planItems: MergedPlanItem[] = events.map((event) => {
    const transaction = findMatchingTransaction(event, transactions, used);
    if (transaction) used.add(transaction.id);
    return {
      kind: "plan" as const,
      status: (transaction ? "done" : "pending") as DayItemStatus,
      event,
      transaction,
    };
  });

  const extras: MergedExtraItem[] = transactions
    .filter((tx) => !used.has(tx.id))
    .map((tx) => ({ kind: "extra" as const, transaction: tx }));

  return [...planItems, ...extras];
}

export function hasPlanItems(items: MergedDayItem[]) {
  return items.some((item) => item.kind === "plan");
}

export function hasExtraItems(items: MergedDayItem[]) {
  return items.some((item) => item.kind === "extra");
}

export function filterItemsForView(
  items: MergedDayItem[],
  filter: "all" | "motion" | "fixed" | "registered",
): MergedDayItem[] {
  switch (filter) {
    case "fixed":
      return items.filter((item) => item.kind === "plan");
    case "registered":
      return items.filter((item) => item.kind === "extra");
    default:
      return items;
  }
}

export function dayMatchesFilter(
  items: MergedDayItem[],
  filter: "all" | "motion" | "fixed" | "registered",
): boolean {
  switch (filter) {
    case "motion":
      return items.length > 0;
    case "fixed":
      return hasPlanItems(items);
    case "registered":
      return hasExtraItems(items);
    default:
      return true;
  }
}

export function dayItemLabel(item: MergedDayItem): string {
  if (item.kind === "plan") return item.event.label;
  return item.transaction.description || item.transaction.categoryName;
}

export function dayItemAmount(item: MergedDayItem): number {
  if (item.kind === "plan") {
    return item.transaction?.amount ?? item.event.amount;
  }
  return item.transaction.amount;
}

export function dayItemType(item: MergedDayItem): TransactionType {
  if (item.kind === "plan") return item.event.type;
  return item.transaction.type;
}

/**
 * Events to paint on the Mapa calendar cell.
 * Past days: only realized lançamentos (hides plan ghosts after “só este dia”).
 * Today/future: full plan + avulsos.
 */
export function calendarEventsForDay(
  events: CommitmentMapEvent[],
  transactions: TransactionDTO[],
  date: string,
  today: string,
): CommitmentMapEvent[] {
  const dayTxs = transactions.filter((tx) => tx.date === date);
  const merged = mergeDayItems(events, dayTxs);

  if (date < today) {
    const realized: CommitmentMapEvent[] = [];
    for (const item of merged) {
      if (item.kind === "plan" && item.status === "done" && item.transaction) {
        const tx = item.transaction;
        realized.push({
          ...item.event,
          payMode: payModeFromLedgerColumn(tx.ledgerColumn),
          affectsCash: tx.affectsBalance,
          amount: tx.amount,
          label:
            tx.description?.trim() ||
            tx.categoryName ||
            item.event.label,
        });
      } else if (item.kind === "extra") {
        realized.push(transactionAsMapEvent(item.transaction, date));
      }
    }
    return realized;
  }

  const visible: CommitmentMapEvent[] = [];
  for (const item of merged) {
    if (item.kind === "plan") {
      if (item.transaction) {
        visible.push({
          ...item.event,
          payMode: payModeFromLedgerColumn(item.transaction.ledgerColumn),
          affectsCash: item.transaction.affectsBalance,
          amount: item.transaction.amount,
          label:
            item.transaction.description?.trim() ||
            item.transaction.categoryName ||
            item.event.label,
        });
      } else {
        visible.push(item.event);
      }
    } else {
      visible.push(transactionAsMapEvent(item.transaction, date));
    }
  }
  return visible;
}

function transactionAsMapEvent(
  transaction: TransactionDTO,
  date: string,
): CommitmentMapEvent {
  return {
    id: `tx:${transaction.id}`,
    ruleId: transaction.recurringId ?? transaction.id,
    date,
    day: Number(date.slice(8, 10)),
    type: transaction.type,
    amount: transaction.amount,
    label:
      transaction.description?.trim() ||
      transaction.categoryName ||
      (transaction.type === "INCOME" ? "Receita" : "Gasto"),
    categoryColor: transaction.categoryColor,
    active: true,
    payMode: payModeFromLedgerColumn(transaction.ledgerColumn),
    affectsCash: transaction.affectsBalance,
  };
}

/** Líquido do dia no caixa (ignora compras no crédito). */
export function dayCashNet(events: CommitmentMapEvent[]) {
  let net = 0;
  for (const event of events) {
    if (!event.affectsCash) continue;
    net += event.type === "INCOME" ? event.amount : -event.amount;
  }
  return net;
}

/** Compras no crédito deste dia (não saem do caixa agora). */
export function dayCardCharges(events: CommitmentMapEvent[]) {
  let total = 0;
  for (const event of events) {
    if (event.payMode !== "card" || event.affectsCash) continue;
    total += event.amount;
  }
  return total;
}
