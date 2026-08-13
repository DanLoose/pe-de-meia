import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { futureCashDeltaByDate } from "@/lib/horizon-cash";

describe("futureCashDeltaByDate", () => {
  it("includes one-off future income", () => {
    const map = futureCashDeltaByDate([
      {
        date: "2026-08-20",
        amount: 500,
        ledgerColumn: "INCOME",
        categoryLedgerColumn: "INCOME",
        affectsBalance: true,
        recurringId: null,
      },
    ]);

    assert.equal(map.get("2026-08-20"), 500);
  });

  it("includes one-off expense and card payment", () => {
    const map = futureCashDeltaByDate([
      {
        date: "2026-08-21",
        amount: 80,
        ledgerColumn: "DAILY",
        categoryLedgerColumn: "DAILY",
        affectsBalance: true,
        recurringId: null,
      },
      {
        date: "2026-08-21",
        amount: 200,
        ledgerColumn: "CARD",
        categoryLedgerColumn: "CARD",
        affectsBalance: true,
        recurringId: null,
      },
    ]);

    assert.equal(map.get("2026-08-21"), -280);
  });

  it("skips recurring-linked txs to avoid double-count", () => {
    const map = futureCashDeltaByDate([
      {
        date: "2026-08-05",
        amount: 159.9,
        ledgerColumn: "EXPENSE",
        categoryLedgerColumn: "EXPENSE",
        affectsBalance: true,
        recurringId: "rule-1",
      },
      {
        date: "2026-08-05",
        amount: 40,
        ledgerColumn: "DAILY",
        categoryLedgerColumn: "DAILY",
        affectsBalance: true,
        recurringId: null,
      },
    ]);

    assert.equal(map.get("2026-08-05"), -40);
  });

  it("skips card purchases that do not affect balance", () => {
    const map = futureCashDeltaByDate([
      {
        date: "2026-08-22",
        amount: 90,
        ledgerColumn: "CARD",
        categoryLedgerColumn: "CARD",
        affectsBalance: false,
        recurringId: null,
      },
    ]);

    assert.equal(map.size, 0);
  });
});
