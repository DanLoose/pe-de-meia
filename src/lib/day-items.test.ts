import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CommitmentMapEvent } from "@/lib/commitment-map";
import { mergeDayItems, dayMatchesFilter, filterItemsForView, calendarEventsForDay, dayCashNet, dayCardCharges } from "@/lib/day-items";
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
    payMode: "cash",
    affectsCash: true,
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

describe("calendarEventsForDay", () => {
  it("hides pending plan ghosts on past days after occurrence delete", () => {
    const events = [
      event({ id: "e1", ruleId: "r1", label: "internet", amount: 100 }),
      event({ id: "e2", ruleId: "r2", label: "academia", amount: 110 }),
    ];
    const visible = calendarEventsForDay(events, [], "2026-08-05", "2026-08-12");
    assert.equal(visible.length, 0);
  });

  it("keeps realized plan items on past days", () => {
    const events = [
      event({ id: "e1", ruleId: "r1", label: "internet", amount: 100 }),
    ];
    const visible = calendarEventsForDay(
      events,
      [tx({ id: "t1", description: "internet", amount: 100, recurringId: "r1" })],
      "2026-08-05",
      "2026-08-12",
    );
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.label, "internet");
    assert.equal(visible[0]?.payMode, "cash");
  });

  it("marks card ledger transactions as card payMode", () => {
    const visible = calendarEventsForDay(
      [],
      [
        tx({
          id: "t2",
          description: "uber",
          amount: 32,
          date: "2026-08-20",
          ledgerColumn: "CARD",
          affectsBalance: false,
        }),
      ],
      "2026-08-20",
      "2026-08-12",
    );
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.payMode, "card");
    assert.equal(visible[0]?.affectsCash, false);
  });

  it("keeps pending plan items on future days", () => {
    const events = [
      event({
        id: "e1",
        ruleId: "r1",
        label: "aluguel",
        amount: 2000,
        date: "2026-08-20",
        day: 20,
      }),
    ];
    const visible = calendarEventsForDay(
      events,
      [],
      "2026-08-20",
      "2026-08-12",
    );
    assert.equal(visible.length, 1);
  });
});

describe("dayCashNet / dayCardCharges", () => {
  it("excludes card purchases from cash net", () => {
    const events = [
      event({
        id: "e1",
        ruleId: "r1",
        label: "aluguel",
        amount: 1000,
        payMode: "cash",
        affectsCash: true,
      }),
      event({
        id: "e2",
        ruleId: "r2",
        label: "contabilidade",
        amount: 455,
        payMode: "card",
        affectsCash: false,
      }),
    ];
    assert.equal(dayCashNet(events), -1000);
    assert.equal(dayCardCharges(events), 455);
  });
});
