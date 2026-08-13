import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HorizonRuleInput } from "@/lib/horizon-recurring";
import {
  buildOpenInvoiceRunningByDate,
  closedInvoiceDueOnDate,
} from "@/lib/mapa-card-invoice";
import {
  buildCycleRibbonSegments,
  buildInvoiceStory,
  buildMapaDaySnapshots,
  cyclePhaseForDay,
  findNextCrunch,
  largestCashDebitCause,
  monthDayDates,
  projectBalanceRange,
  shouldShowOpenInvoiceFooter,
  summarizeMonthHeat,
} from "@/lib/mapa-snapshot";

const closingDay = 1;
const dueDay = 10;

describe("projectBalanceRange", () => {
  it("seeds today and projects recurrings + cash without variable burn", () => {
    const rules: HorizonRuleInput[] = [
      {
        id: "rent",
        type: "EXPENSE",
        amount: 2000,
        description: "Aluguel",
        dayOfMonth: 5,
        startsOn: "2026-01-01",
        endsOn: null,
        categoryName: "Moradia",
        categoryLedgerColumn: "EXPENSE",
      },
    ];
    const cashDeltaByDate = new Map([["2026-09-10", -615]]);

    const balances = projectBalanceRange({
      today: "2026-09-01",
      todayBalance: 3000,
      endDate: "2026-09-10",
      rules,
      cashDeltaByDate,
    });

    assert.equal(balances.get("2026-09-01"), 3000);
    assert.equal(balances.get("2026-09-04"), 3000);
    assert.equal(balances.get("2026-09-05"), 1000);
    assert.equal(balances.get("2026-09-10"), 385);
  });
});

describe("mapa snapshot cycle close=1 / due=10", () => {
  it("builds days with closing/due flags and open invoice reset after close", () => {
    const charges = [
      { date: "2026-08-05", amount: 160 },
      { date: "2026-08-14", amount: 455 },
      { date: "2026-09-03", amount: 50 },
    ];
    const dayDates = monthDayDates(2026, 9);
    const openInvoiceByDate = buildOpenInvoiceRunningByDate(
      dayDates,
      charges,
      closingDay,
      dueDay,
    );

    assert.equal(openInvoiceByDate.get("2026-09-01"), 615);
    assert.equal(openInvoiceByDate.get("2026-09-02"), 0);
    assert.equal(openInvoiceByDate.get("2026-09-03"), 50);
    assert.equal(closedInvoiceDueOnDate("2026-09-10", charges, 1, 10), 615);

    const balanceByDate = new Map(
      dayDates.map((d) => [d, 1000] as const),
    );
    const cashNetByDate = new Map<string, number>();
    cashNetByDate.set("2026-09-10", -615);

    const days = buildMapaDaySnapshots({
      dayDates,
      balanceByDate,
      cashNetByDate,
      openInvoiceByDate,
      closingDay,
      dueDay,
      paydayDates: new Set(["2026-09-05"]),
    });

    const closing = days.find((d) => d.date === "2026-09-01");
    const afterClose = days.find((d) => d.date === "2026-09-02");
    const due = days.find((d) => d.date === "2026-09-10");
    const payday = days.find((d) => d.date === "2026-09-05");

    assert.equal(closing?.flags.closing, true);
    assert.equal(closing?.openInvoice, 615);
    assert.equal(afterClose?.openInvoice, 0);
    assert.equal(due?.flags.due, true);
    assert.equal(due?.cashNet, -615);
    assert.equal(payday?.flags.payday, true);

    const story = buildInvoiceStory({
      asOfDate: "2026-09-03",
      year: 2026,
      month: 9,
      closingDay,
      dueDay,
      charges,
    });
    assert.equal(story.closingDay, 1);
    assert.equal(story.dueDay, 10);
    assert.equal(story.openAmount, 50);
    assert.equal(story.dueAmount, 615);
  });
});

describe("findNextCrunch", () => {
  it("picks the day with low balance and the largest debit cause", () => {
    const crunch = findNextCrunch({
      today: "2026-09-01",
      lowThreshold: 500,
      days: [
        { date: "2026-09-01", balance: 2000 },
        { date: "2026-09-05", balance: 400 },
        { date: "2026-09-10", balance: -100 },
      ],
      causesByDate: new Map([
        [
          "2026-09-05",
          [
            { label: "Farmácia", cashDelta: -80 },
            { label: "Consórcio", cashDelta: -1288 },
          ],
        ],
        [
          "2026-09-10",
          [{ label: "Paga fatura", cashDelta: -615 }],
        ],
      ]),
    });

    assert.ok(crunch);
    assert.equal(crunch.date, "2026-09-05");
    assert.equal(crunch.causeLabel, "Consórcio");
    assert.equal(crunch.causeAmount, 1288);
  });

  it("largestCashDebitCause ignores credits", () => {
    const best = largestCashDebitCause([
      { label: "Salário", cashDelta: 5000 },
      { label: "Paga fatura", cashDelta: -455 },
      { label: "PIX", cashDelta: -90 },
    ]);
    assert.equal(best?.label, "Paga fatura");
    assert.equal(best?.cashDelta, -455);
  });
});

describe("buildCycleRibbonSegments", () => {
  it("close=1 / due=10: close → closed → pay → open", () => {
    const segments = buildCycleRibbonSegments(2026, 9, 1, 10);
    assert.deepEqual(segments, [
      { phase: "close", startDay: 1, endDay: 1 },
      { phase: "closed", startDay: 2, endDay: 9 },
      { phase: "pay", startDay: 10, endDay: 10 },
      { phase: "open", startDay: 11, endDay: 30 },
    ]);
    assert.equal(cyclePhaseForDay(1, 1, 10, 30), "close");
    assert.equal(cyclePhaseForDay(5, 1, 10, 30), "closed");
    assert.equal(cyclePhaseForDay(10, 1, 10, 30), "pay");
    assert.equal(cyclePhaseForDay(20, 1, 10, 30), "open");
  });

  it("close=25 / due=10: closed → pay → open → close → closed", () => {
    const segments = buildCycleRibbonSegments(2026, 9, 25, 10);
    assert.deepEqual(segments, [
      { phase: "closed", startDay: 1, endDay: 9 },
      { phase: "pay", startDay: 10, endDay: 10 },
      { phase: "open", startDay: 11, endDay: 24 },
      { phase: "close", startDay: 25, endDay: 25 },
      { phase: "closed", startDay: 26, endDay: 30 },
    ]);
  });
});

describe("summarizeMonthHeat", () => {
  it("marks hasRed when any day is negative", () => {
    const heat = summarizeMonthHeat([
      { balance: 800 },
      { balance: 200 },
      { balance: -10 },
    ]);
    assert.equal(heat.band, "bad");
    assert.equal(heat.hasRed, true);
  });

  it("uses low band when no negative days", () => {
    const heat = summarizeMonthHeat([{ balance: 800 }, { balance: 100 }]);
    assert.equal(heat.band, "low");
    assert.equal(heat.hasRed, false);
  });
});

describe("payment day vs open invoice footer", () => {
  it("does not show open invoice on due day when there is only the payment", () => {
    const charges = [
      { date: "2026-08-05", amount: 160 },
      { date: "2026-08-14", amount: 455 },
    ];
    // Due day belongs to the next open cycle — running open is 0.
    const openOnDue = buildOpenInvoiceRunningByDate(
      ["2026-09-10"],
      charges,
      closingDay,
      dueDay,
    );
    assert.equal(openOnDue.get("2026-09-10"), 0);

    const paymentCashNet = -closedInvoiceDueOnDate(
      "2026-09-10",
      charges,
      closingDay,
      dueDay,
    );
    assert.equal(paymentCashNet, -615);

    // Even if open were somehow non-zero, due-only days must not show purple footer.
    assert.equal(
      shouldShowOpenInvoiceFooter({
        openInvoice: 615,
        cardChargesToday: 0,
        isClosing: false,
      }),
      false,
    );
    assert.equal(
      shouldShowOpenInvoiceFooter({
        openInvoice: 615,
        cardChargesToday: 0,
        isClosing: true,
      }),
      true,
    );
    assert.equal(
      shouldShowOpenInvoiceFooter({
        openInvoice: 50,
        cardChargesToday: 50,
        isClosing: false,
      }),
      true,
    );
  });
});
