import type { LedgerDayRow } from "@/types";

export type BalanceBand = "ok" | "low" | "bad";

export interface NegativeStreak {
  startDay: number;
  endDay: number;
  days: number;
}

const DEFAULT_LOW = 500;

export function balanceBand(
  balance: number,
  lowThreshold = DEFAULT_LOW,
): BalanceBand {
  if (balance < 0) return "bad";
  if (balance <= lowThreshold) return "low";
  return "ok";
}

/** Longest contiguous negative-balance streak in the month (by calendar day). */
export function longestNegativeStreak(
  rows: LedgerDayRow[],
): NegativeStreak | null {
  let best: NegativeStreak | null = null;
  let runStart: number | null = null;
  let runEnd: number | null = null;

  const flush = () => {
    if (runStart === null || runEnd === null) return;
    const days = runEnd - runStart + 1;
    if (!best || days > best.days) {
      best = { startDay: runStart, endDay: runEnd, days };
    }
    runStart = null;
    runEnd = null;
  };

  for (const row of rows) {
    if (row.balance < 0) {
      if (runStart === null) runStart = row.day;
      runEnd = row.day;
    } else {
      flush();
    }
  }
  flush();
  return best;
}

export function balanceOnDate(
  rows: LedgerDayRow[],
  date: string,
): number | null {
  const row = rows.find((r) => r.date === date);
  return row ? row.balance : null;
}
