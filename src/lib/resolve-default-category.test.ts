import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveDefaultCategory } from "@/lib/resolve-default-category";
import type { CategoryDTO } from "@/types";

const categories: CategoryDTO[] = [
  {
    id: "sal",
    name: "Salário",
    color: "#0",
    type: "INCOME",
    ledgerColumn: "INCOME",
  },
  {
    id: "moradia",
    name: "Moradia",
    color: "#0",
    type: "EXPENSE",
    ledgerColumn: "EXPENSE",
  },
  {
    id: "avista",
    name: "À vista",
    color: "#0",
    type: "EXPENSE",
    ledgerColumn: "DAILY",
  },
  {
    id: "fatura",
    name: "Fatura",
    color: "#0",
    type: "EXPENSE",
    ledgerColumn: "CARD",
  },
];

describe("resolveDefaultCategory", () => {
  it("prefers matching ledger column", () => {
    const match = resolveDefaultCategory(categories, {
      type: "EXPENSE",
      ledgerColumn: "DAILY",
    });
    assert.equal(match?.id, "avista");
  });

  it("falls back to first of type when column missing", () => {
    const match = resolveDefaultCategory(categories, {
      type: "EXPENSE",
      ledgerColumn: "SAVINGS",
    });
    assert.equal(match?.id, "moradia");
  });

  it("resolves income", () => {
    const match = resolveDefaultCategory(categories, {
      type: "INCOME",
      ledgerColumn: "INCOME",
    });
    assert.equal(match?.id, "sal");
  });

  it("returns null when none match type", () => {
    const match = resolveDefaultCategory([], {
      type: "EXPENSE",
      ledgerColumn: "DAILY",
    });
    assert.equal(match, null);
  });
});
