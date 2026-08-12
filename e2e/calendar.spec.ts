import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { createExpenseEntry, loginAsDemo } from "./helpers";

test.describe("Finance calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/calendario");
  });

  test("shows month view with navigation controls", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: copy.calendarTitle }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Mês", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Semana", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Hoje", exact: true })).toBeVisible();
  });

  test("navigates to the next month without breaking the grid", async ({ page }) => {
    await expect(page.locator(".fc-daygrid-body tr")).toHaveCount(6);

    await page.getByRole("button", { name: "Próximo Mês" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: /setembro de 2026/i }),
    ).toBeVisible();
    await expect(page.locator(".fc-daygrid-body tr")).toHaveCount(5);
    await expect(page.locator(".fc-daygrid-day")).toHaveCount(35);
  });

  test("shows period summary for the visible range", async ({ page }) => {
    await expect(page.getByTestId("period-summary-bar")).toBeVisible();
    await expect(page.getByText(copy.period.income)).toBeVisible();
    await expect(page.getByText(copy.period.expense)).toBeVisible();
    await expect(page.getByText(copy.period.net)).toBeVisible();
  });

  test("creates an expense and shows it in the day detail sheet", async ({
    page,
  }) => {
    const testDate = "2026-08-28";
    const description = `Playwright expense ${Date.now()}`;

    await createExpenseEntry(page, {
      amount: "8888",
      date: testDate,
      description,
    });

    await page.locator(`.fc-daygrid-day[data-date="${testDate}"]`).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(description)).toBeVisible();
    await expect(
      sheet.locator('[data-testid^="entry-row-"]').filter({ hasText: description }),
    ).toContainText("-R$ 88,88");
  });

  test("deletes an entry from the day detail sheet", async ({ page }) => {
    const testDate = "2026-08-29";
    const description = `Entry to delete ${Date.now()}`;

    await createExpenseEntry(page, {
      amount: "3333",
      date: testDate,
      description,
    });

    await page.locator(`.fc-daygrid-day[data-date="${testDate}"]`).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(description)).toBeVisible();

    await sheet
      .locator('[data-testid^="entry-row-"]')
      .filter({ hasText: description })
      .getByRole("button", { name: copy.daySheet.deleteEntry })
      .click();

    await page.getByTestId("confirm-delete-entry").click();

    await expect(sheet.getByText(description)).not.toBeVisible();
  });
});
