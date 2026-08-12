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
    await expect(page.getByTestId("ledger-totals")).toBeVisible();
  });

  test("navigates between months", async ({ page }) => {
    await page.getByRole("button", { name: copy.ledger.nextMonth }).click();
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  });

  test("opens day sheet from the day cell", async ({ page }) => {
    const testDate = "2026-08-15";
    await page.getByTestId(`ledger-cell-${testDate}-day`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("opens column sheet from the entradas cell", async ({ page }) => {
    const testDate = "2026-08-12";
    await page.getByTestId(`ledger-cell-${testDate}-income`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("ledger-column-filter")).toContainText(
      copy.ledger.income,
    );
    await page.getByRole("button", { name: copy.daySheet.addEntry }).first().click();
    await expect(
      page.getByRole("heading", { name: copy.entry.new }),
    ).toBeVisible();
    await expect(page.getByTestId("entry-submit")).toContainText(
      copy.ledger.income.toLowerCase(),
    );
  });

  test("opens column sheet from the saidas cell", async ({ page }) => {
    const testDate = "2026-08-12";
    await page.getByTestId(`ledger-cell-${testDate}-expense`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("ledger-column-filter")).toContainText(
      copy.ledger.expense,
    );
    await page.getByRole("button", { name: copy.daySheet.addEntry }).first().click();
    await expect(
      page.getByRole("heading", { name: copy.entry.new }),
    ).toBeVisible();
    await expect(page.getByTestId("entry-submit")).toContainText(
      copy.ledger.expense.toLowerCase(),
    );
  });

  test("opens a new income entry from the entradas icon", async ({ page }) => {
    const testDate = "2026-08-12";
    await page.getByTestId(`ledger-add-${testDate}-income`).click();
    await expect(
      page.getByRole("heading", { name: copy.entry.new }),
    ).toBeVisible();
    await expect(page.getByTestId("entry-submit")).toContainText(
      copy.ledger.income.toLowerCase(),
    );
  });

  test("opens column sheet from the economias cell", async ({ page }) => {
    const testDate = "2026-08-12";
    await page.getByTestId(`ledger-cell-${testDate}-savings`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("ledger-column-filter")).toContainText(
      copy.ledger.savings,
    );
    await page.getByRole("button", { name: copy.daySheet.addEntry }).first().click();
    await expect(
      page.getByRole("heading", { name: copy.entry.new }),
    ).toBeVisible();
    await expect(page.getByTestId("entry-submit")).toContainText(
      copy.ledger.savings.toLowerCase(),
    );
  });

  test("opens column sheet from the diarios cell", async ({ page }) => {
    const testDate = "2026-08-12";
    await page.getByTestId(`ledger-cell-${testDate}-daily`).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("ledger-column-filter")).toContainText(
      copy.ledger.daily,
    );
    await page.getByRole("button", { name: copy.daySheet.addEntry }).first().click();
    await expect(
      page.getByRole("heading", { name: copy.entry.new }),
    ).toBeVisible();
    await expect(page.getByTestId("entry-submit")).toContainText(
      copy.ledger.daily.toLowerCase(),
    );
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
