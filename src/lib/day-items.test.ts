import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommitmentMapEvent } from "@/lib/commitment-map";
import { mergeDayItems, dayMatchesFilter, filterItemsForView } from "@/lib/day-items";
import type { TransactionDTO } from "@/types";

function event(
  partial: Partial<CommitmentMapEvent> & Pick<CommitmentMapEvent, "id" | "ruleId" | "label">,
): CommitmentMapEvent {
  return {
    date: "2026-08-05",
    day: 5,
    type: "EXPENSE",
    amount: 100,
    categoryColor: "#f00",
    active: true,
    ...partial,
  };
}

function tx(
  partial: Partial<TransactionDTO> & Pick<TransactionDTO, "id" | "description">,
): TransactionDTO {
  return {
    type: "EXPENSE",
    amount: 100,
    date: "2026-08-05",
    categoryId: "c1",
    categoryName: "Contas",
    categoryColor: "#f00",
    recurringId: null,
    ledgerColumn: "DAILY",
    affectsBalance: true,
    cardInvoiceId: null,
    ...partial,
  };
}

describe("mergeDayItems", () => {
  it("links plan to transaction by recurringId without duplicating", () => {
    const items = mergeDayItems(
      [event({ id: "e1", ruleId: "r1", label: "academia", amount: 159.9 })],
      [
        tx({
          id: "t1",
          description: "academia",
          amount: 159.9,
          recurringId: "r1",
        }),
      ],
    );

    assert.equal(items.length, 1);
    assert.equal(items[0]?.kind, "plan");
    if (items[0]?.kind === "plan") {
      assert.equal(items[0].status, "done");
      assert.equal(items[0].transaction?.id, "t1");
    }
  });

  it("keeps pending plan and shows unmatched txs as extras", () => {
    const items = mergeDayItems(
      [event({ id: "e1", ruleId: "r1", label: "academia", amount: 159.9 })],
      [tx({ id: "t2", description: "almoço", amount: 32 })],
    );

    assert.equal(items.length, 2);
    assert.equal(items[0]?.kind, "plan");
    if (items[0]?.kind === "plan") assert.equal(items[0].status, "pending");
    assert.equal(items[1]?.kind, "extra");
  });

  it("falls back to label+amount match when recurringId is missing", () => {
    const items = mergeDayItems(
      [event({ id: "e1", ruleId: "r1", label: "Internet - vivo fibra", amount: 100 })],
      [
        tx({
          id: "t1",
          description: "Internet - vivo fibra",
          amount: 100,
          recurringId: null,
        }),
      ],
    );

    assert.equal(items.length, 1);
    if (items[0]?.kind === "plan") assert.equal(items[0].status, "done");
  });

  it("filter fixed keeps plan days; registered keeps only extras", () => {
    const items = mergeDayItems(
      [event({ id: "e1", ruleId: "r1", label: "academia", amount: 159.9 })],
      [
        tx({
          id: "t1",
          description: "academia",
          amount: 159.9,
          recurringId: "r1",
        }),
        tx({ id: "t2", description: "almoço", amount: 32 }),
      ],
    );

    assert.equal(dayMatchesFilter(items, "fixed"), true);
    assert.equal(dayMatchesFilter(items, "registered"), true);
    assert.equal(filterItemsForView(items, "fixed").length, 1);
    assert.equal(filterItemsForView(items, "registered").length, 1);
    assert.equal(filterItemsForView(items, "registered")[0]?.kind, "extra");
  });

  it("registered filter ignores days that only have paid fixos", () => {
    const items = mergeDayItems(
      [event({ id: "e1", ruleId: "r1", label: "academia", amount: 159.9 })],
      [
        tx({
          id: "t1",
          description: "academia",
          amount: 159.9,
          recurringId: "r1",
        }),
      ],
    );

    assert.equal(dayMatchesFilter(items, "fixed"), true);
    assert.equal(dayMatchesFilter(items, "registered"), false);
  });
});
