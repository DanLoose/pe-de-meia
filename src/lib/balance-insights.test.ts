import assert from "node:assert/strict";
import { test } from "node:test";
import { longestNegativeStreak } from "./balance-insights";
import type { LedgerDayRow } from "../types";

function row(day: number, balance: number): LedgerDayRow {
  return {
    date: `2026-08-${String(day).padStart(2, "0")}`,
    day,
    income: 0,
    expense: 0,
    daily: 0,
    savings: 0,
    card: 0,
    balance,
  };
}

test("longestNegativeStreak returns null when no negative days", () => {
  assert.equal(longestNegativeStreak([row(1, 100), row(2, 50)]), null);
});

test("longestNegativeStreak finds the longest contiguous red stretch", () => {
  const rows = [
    row(1, 10),
    row(2, -1),
    row(3, -2),
    row(4, 5),
    row(5, -1),
    row(6, -2),
    row(7, -3),
    row(8, -4),
    row(9, 1),
  ];
  assert.deepEqual(longestNegativeStreak(rows), {
    startDay: 5,
    endDay: 8,
    days: 4,
  });
});
