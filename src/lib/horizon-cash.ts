import { cashDelta } from "@/lib/cash";
import { resolveLedgerColumn } from "@/lib/ledger-columns";
import type { LedgerColumn } from "@/types";

export interface FutureCashTxInput {
  date: string;
  amount: number;
  ledgerColumn: LedgerColumn | null;
  categoryLedgerColumn: LedgerColumn;
  affectsBalance: boolean;
  recurringId: string | null;
}

/**
 * One-off future cash movements by date.
 * Skips recurring-linked txs (already projected from rules) to avoid double-count.
 */
export function futureCashDeltaByDate(
  txs: FutureCashTxInput[],
): Map<string, number> {
  const byDate = new Map<string, number>();

  for (const tx of txs) {
    if (tx.recurringId) continue;
    if (!tx.affectsBalance) continue;

    const column = resolveLedgerColumn(
      tx.ledgerColumn,
      tx.categoryLedgerColumn,
    );
    const delta = cashDelta(column, tx.amount, tx.affectsBalance);
    if (delta === 0) continue;

    byDate.set(tx.date, (byDate.get(tx.date) ?? 0) + delta);
  }

  return byDate;
}
