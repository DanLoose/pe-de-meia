import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allocateEvenly,
  buildVariableEstimateBurn,
} from "@/lib/horizon-variable";

describe("allocateEvenly", () => {
  it("splits cents across days", () => {
    const map = allocateEvenly(10, ["2026-08-13", "2026-08-14", "2026-08-15"]);
    const sum = [...map.values()].reduce((a, b) => a + b, 0);
    assert.equal(Number(sum.toFixed(2)), 10);
    assert.equal(map.size, 3);
  });
});

describe("buildVariableEstimateBurn", () => {
  it("spreads remaining estimate over days after today in current month", () => {
    const burn = buildVariableEstimateBurn({
      today: "2026-08-28",
      endDate: "2026-08-31",
      monthlyEstimate: 900,
      spentInCurrentMonth: 300,
    });

    assert.equal(burn.get("2026-08-28"), undefined);
    assert.equal(burn.get("2026-08-29"), 200);
    assert.equal(burn.get("2026-08-30"), 200);
    assert.equal(burn.get("2026-08-31"), 200);
  });

  it("uses full estimate on future months", () => {
    const burn = buildVariableEstimateBurn({
      today: "2026-08-31",
      endDate: "2026-09-03",
      monthlyEstimate: 900,
      spentInCurrentMonth: 900,
    });

    const sepTotal =
      (burn.get("2026-09-01") ?? 0) +
      (burn.get("2026-09-02") ?? 0) +
      (burn.get("2026-09-03") ?? 0);
    assert.equal(Number(sepTotal.toFixed(2)), 900);
  });

  it("does not invent burn when current month has no remaining days", () => {
    const burn = buildVariableEstimateBurn({
      today: "2026-08-31",
      endDate: "2026-09-02",
      monthlyEstimate: 100,
      spentInCurrentMonth: 0,
    });

    assert.equal(burn.get("2026-08-31"), undefined);
    const sepTotal =
      (burn.get("2026-09-01") ?? 0) + (burn.get("2026-09-02") ?? 0);
    assert.equal(Number(sepTotal.toFixed(2)), 100);
  });
});
