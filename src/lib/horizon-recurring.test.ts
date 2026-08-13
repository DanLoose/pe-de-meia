import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  projectedRecurringNetForDate,
  ruleOccursOnDate,
} from "@/lib/horizon-recurring";

describe("ruleOccursOnDate", () => {
  it("matches day of month within startsOn/endsOn", () => {
    assert.equal(
      ruleOccursOnDate(
        { dayOfMonth: 1, startsOn: "2026-01-01", endsOn: null },
        "2026-09-01",
      ),
      true,
    );
  });

  it("rejects dates after endsOn", () => {
    assert.equal(
      ruleOccursOnDate(
        { dayOfMonth: 1, startsOn: "2026-01-01", endsOn: "2026-08-31" },
        "2026-09-01",
      ),
      false,
    );
  });

  it("rejects dates before startsOn", () => {
    assert.equal(
      ruleOccursOnDate(
        { dayOfMonth: 1, startsOn: "2026-10-01", endsOn: null },
        "2026-09-01",
      ),
      false,
    );
  });
});

describe("projectedRecurringNetForDate", () => {
  it("sums income and expense on the day", () => {
    const net = projectedRecurringNetForDate(
      [
        {
          id: "r1",
          type: "INCOME",
          amount: 5000,
          description: "salário",
          dayOfMonth: 1,
          startsOn: "2026-01-01",
          endsOn: null,
          categoryName: "Salário",
          categoryLedgerColumn: "INCOME",
        },
        {
          id: "r2",
          type: "EXPENSE",
          amount: 100,
          description: "internet",
          dayOfMonth: 1,
          startsOn: "2026-01-01",
          endsOn: null,
          categoryName: "Contas",
          categoryLedgerColumn: "EXPENSE",
        },
      ],
      "2026-09-01",
    );
    assert.equal(net, 4900);
  });

  it("ignores ended rules", () => {
    const net = projectedRecurringNetForDate(
      [
        {
          id: "r1",
          type: "INCOME",
          amount: 5000,
          description: "salário antigo",
          dayOfMonth: 1,
          startsOn: "2025-01-01",
          endsOn: "2026-06-30",
          categoryName: "Salário",
          categoryLedgerColumn: "INCOME",
        },
      ],
      "2026-09-01",
    );
    assert.equal(net, 0);
  });
});
