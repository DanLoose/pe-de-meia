import type { LedgerColumn } from "@/types";

/**
 * Cash impact of a ledger movement on checking-account balance.
 * CARD purchases are commitments (false); invoice payments set true explicitly.
 */
export function defaultAffectsBalance(column: LedgerColumn): boolean {
  return column !== "CARD";
}

export function cashDelta(
  column: LedgerColumn,
  amount: number,
  affectsBalance = true,
): number {
  if (!affectsBalance || amount === 0) {
    return 0;
  }

  return column === "INCOME" ? amount : -amount;
}
