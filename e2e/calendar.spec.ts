import { expect, test } from "@playwright/test";
import { createExpenseEntry, loginAsDemo } from "./helpers";

test.describe("Finance calendar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows month view with navigation controls", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Finance Calendar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "month", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "week", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "today", exact: true })).toBeVisible();
  });

  test("creates an expense and shows it in the day detail sheet", async ({ page }) => {
    const testDate = "2026-08-28";
    const description = `Playwright expense ${Date.now()}`;

    await createExpenseEntry(page, {
      amount: "88.88",
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
      amount: "33.33",
      date: testDate,
      description,
    });

    await page.locator(`.fc-daygrid-day[data-date="${testDate}"]`).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(description)).toBeVisible();

    await sheet
      .locator('[data-testid^="entry-row-"]')
      .filter({ hasText: description })
      .getByRole("button", { name: "Delete entry" })
      .click();

    await expect(sheet.getByText(description)).not.toBeVisible();
  });
});
