import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { loginAsDemo } from "./helpers";

test.describe("Planilha de saldos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows ledger table as home after login", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: copy.ledger.title }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: copy.ledger.income })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: copy.ledger.balance })).toBeVisible();
  });

  test("navigates between months", async ({ page }) => {
    await page.getByRole("button", { name: copy.ledger.nextMonth }).click();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("opens day sheet on row click", async ({ page }) => {
    const testDate = "2026-08-15";
    await page.getByTestId(`ledger-row-${testDate}`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("Totais", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows KPI cards", async ({ page }) => {
    await page.goto("/totais");
    await expect(page.getByText(copy.totals.performance)).toBeVisible();
    await expect(page.getByText(copy.totals.costOfLiving)).toBeVisible();
    await expect(page.getByText(copy.totals.movements)).toBeVisible();
  });
});
