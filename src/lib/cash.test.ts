import assert from "node:assert/strict";
import { test } from "node:test";
import { cashDelta, defaultAffectsBalance } from "./cash";

test("income increases cash", () => {
  assert.equal(cashDelta("INCOME", 1000), 1000);
});

test("expense, daily and card payment decrease cash", () => {
  assert.equal(cashDelta("EXPENSE", 100), -100);
  assert.equal(cashDelta("DAILY", 50), -50);
  assert.equal(cashDelta("CARD", 80, true), -80);
});

test("savings decrease cash (transfer out of checking)", () => {
  assert.equal(cashDelta("SAVINGS", 200), -200);
});

test("commitments with affectsBalance=false do not move cash", () => {
  assert.equal(cashDelta("CARD", 80, false), 0);
  assert.equal(cashDelta("INCOME", 1000, false), 0);
});

test("card purchases do not affect cash by default; other columns do", () => {
  assert.equal(defaultAffectsBalance("CARD"), false);
  assert.equal(defaultAffectsBalance("SAVINGS"), true);
  assert.equal(defaultAffectsBalance("EXPENSE"), true);
});

test("card purchase is ignored; invoice payment reduces cash", () => {
  const opening = 1000;
  const afterPurchase =
    opening + cashDelta("CARD", 80, defaultAffectsBalance("CARD"));
  assert.equal(afterPurchase, 1000);
  assert.equal(afterPurchase + cashDelta("CARD", 80, true), 920);
});

test("running example: income 1000, savings 200, daily 50 => 750", () => {
  const opening = 0;
  const balance =
    opening +
    cashDelta("INCOME", 1000) +
    cashDelta("SAVINGS", 200) +
    cashDelta("DAILY", 50);
  assert.equal(balance, 750);
});
