import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateOnly, parseDateOnly } from "./dates";
import {
  cardPaymentDescription,
  installmentPurchaseDates,
  invoiceCycleForPurchase,
} from "./card-cycle";

function cycle(date: string, closingDay: number, dueDay: number) {
  const bounds = invoiceCycleForPurchase(
    parseDateOnly(date),
    closingDay,
    dueDay,
  );
  return {
    start: formatDateOnly(bounds.cycleStart),
    end: formatDateOnly(bounds.cycleEnd),
    due: formatDateOnly(bounds.dueDate),
  };
}

test("close 1 / due 10: mid-cycle purchase goes to next closing", () => {
  assert.deepEqual(cycle("2026-07-15", 1, 10), {
    start: "2026-07-02",
    end: "2026-08-01",
    due: "2026-08-10",
  });
});

test("close 1 / due 10: purchase on closing day stays in that invoice", () => {
  assert.deepEqual(cycle("2026-08-01", 1, 10), {
    start: "2026-07-02",
    end: "2026-08-01",
    due: "2026-08-10",
  });
});

test("close 1 / due 10: day after closing opens the next invoice", () => {
  assert.deepEqual(cycle("2026-08-02", 1, 10), {
    start: "2026-08-02",
    end: "2026-09-01",
    due: "2026-09-10",
  });
});

test("close 25 / due 10: due date is the following month", () => {
  assert.deepEqual(cycle("2026-08-10", 25, 10), {
    start: "2026-07-26",
    end: "2026-08-25",
    due: "2026-09-10",
  });
});

test("close 25 / due 10: purchase on closing day", () => {
  assert.deepEqual(cycle("2026-08-25", 25, 10), {
    start: "2026-07-26",
    end: "2026-08-25",
    due: "2026-09-10",
  });
});

test("close 25 / due 10: day after closing", () => {
  assert.deepEqual(cycle("2026-08-26", 25, 10), {
    start: "2026-08-26",
    end: "2026-09-25",
    due: "2026-10-10",
  });
});

test("close 15 / due 20: due stays in the closing month", () => {
  assert.deepEqual(cycle("2026-08-15", 15, 20), {
    start: "2026-07-16",
    end: "2026-08-15",
    due: "2026-08-20",
  });
});

test("year boundary: December purchase with close 1 / due 10", () => {
  assert.deepEqual(cycle("2026-12-15", 1, 10), {
    start: "2026-12-02",
    end: "2027-01-01",
    due: "2027-01-10",
  });
});

test("installments land on successive cycles", () => {
  const dates = installmentPurchaseDates(parseDateOnly("2026-07-15"), 1, 10, 3);
  assert.deepEqual(dates.map(formatDateOnly), [
    "2026-07-15",
    "2026-08-02",
    "2026-09-02",
  ]);
});

test("invoice payment description uses due month", () => {
  assert.equal(
    cardPaymentDescription(parseDateOnly("2026-08-10")),
    "Fatura ago/2026",
  );
});
