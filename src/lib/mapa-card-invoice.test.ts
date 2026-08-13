import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpenInvoiceRunningByDate,
  closedInvoiceDueOnDate,
  isCardClosingDay,
  mapaCardLookbackStart,
} from "./mapa-card-invoice";

describe("mapaCardLookbackStart", () => {
  it("covers the earliest cycle start in the month", () => {
    // August with close=1: day 1 ends Aug 1 (start Jul 2); later days end Sep 1 (start Aug 2)
    assert.equal(mapaCardLookbackStart(2026, 8, 1, 10), "2026-07-02");
    assert.equal(mapaCardLookbackStart(2026, 9, 1, 10), "2026-08-02");
  });
});

describe("buildOpenInvoiceRunningByDate", () => {
  it("accumulates within cycle and resets after closing", () => {
    const closingDay = 1;
    const dueDay = 10;
    const charges = [
      { date: "2026-08-05", amount: 160 },
      { date: "2026-08-14", amount: 455 },
      { date: "2026-09-03", amount: 50 },
    ];
    const days = [
      "2026-08-05",
      "2026-08-14",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ];
    const running = buildOpenInvoiceRunningByDate(
      days,
      charges,
      closingDay,
      dueDay,
    );

    assert.equal(running.get("2026-08-05"), 160);
    assert.equal(running.get("2026-08-14"), 615);
    // Sep 1 is closing — Aug purchases still in this cycle
    assert.equal(running.get("2026-09-01"), 615);
    // Sep 2 starts next cycle — empty until a charge
    assert.equal(running.get("2026-09-02"), 0);
    assert.equal(running.get("2026-09-03"), 50);
  });
});

describe("closedInvoiceDueOnDate", () => {
  it("returns closed cycle total on due day", () => {
    const charges = [
      { date: "2026-08-05", amount: 160 },
      { date: "2026-08-14", amount: 455 },
      { date: "2026-09-03", amount: 50 },
    ];
    // close 1 / due 10 → cycle ending Sep 1 is due Sep 10
    assert.equal(closedInvoiceDueOnDate("2026-09-10", charges, 1, 10), 615);
    assert.equal(closedInvoiceDueOnDate("2026-09-09", charges, 1, 10), 0);
  });
});

describe("isCardClosingDay", () => {
  it("matches closing day", () => {
    assert.equal(isCardClosingDay("2026-09-01", 1), true);
    assert.equal(isCardClosingDay("2026-09-02", 1), false);
  });
});
