import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCommitmentMap } from "./commitment-map";
import type { RecurringTransactionDTO } from "../types";

function rule(
  partial: Partial<RecurringTransactionDTO> &
    Pick<RecurringTransactionDTO, "id" | "type" | "amount" | "dayOfMonth">,
): RecurringTransactionDTO {
  return {
    description: partial.description ?? null,
    startsOn: partial.startsOn ?? "2026-01-01",
    endsOn: partial.endsOn ?? null,
    active: partial.active ?? true,
    categoryId: partial.categoryId ?? "c1",
    categoryName: partial.categoryName ?? "Cat",
    categoryColor: partial.categoryColor ?? "#888",
    ledgerColumn:
      partial.ledgerColumn ??
      (partial.type === "INCOME" ? "INCOME" : "EXPENSE"),
    ...partial,
  };
}

test("buildCommitmentMap places income and expense on clamped days", () => {
  const map = buildCommitmentMap(
    [
      rule({
        id: "sal",
        type: "INCOME",
        amount: 4000,
        dayOfMonth: 5,
        description: "Salário",
      }),
      rule({
        id: "aluguel",
        type: "EXPENSE",
        amount: 1500,
        dayOfMonth: 10,
        description: "Aluguel",
      }),
    ],
    2026,
    8,
    800,
  );

  assert.equal(map.fixedIncome, 4000);
  assert.equal(map.fixedExpense, 1500);
  assert.equal(map.variableEstimate, 800);
  assert.equal(map.folga, 1700);
  assert.equal(map.days[4]?.events[0]?.label, "Salário");
  assert.equal(map.days[9]?.events[0]?.label, "Aluguel");
  assert.ok(map.slices.some((s) => s.kind === "variable"));
});

test("buildCommitmentMap clamps day 31 in February", () => {
  const map = buildCommitmentMap(
    [
      rule({
        id: "x",
        type: "EXPENSE",
        amount: 100,
        dayOfMonth: 31,
        description: "Fim",
      }),
    ],
    2026,
    2,
  );
  assert.equal(map.events[0]?.day, 28);
});
