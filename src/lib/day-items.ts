import type { CommitmentMapEvent } from "@/lib/commitment-map";
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
