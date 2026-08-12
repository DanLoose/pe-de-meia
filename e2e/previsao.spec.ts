import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { loginAsDemo } from "./helpers";

test.describe("Orçamento diário", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows budget section under Gastos fixos", async ({ page }) => {
    await page.goto("/gastos-fixos/orcamento-diario");
    await expect(
      page.getByRole("heading", { name: copy.gastosFixos.title }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: copy.gastosFixos.tabDailyBudget }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(copy.dailyBudget.intro)).toBeVisible();
    await expect(page.getByText(copy.dailyBudget.monthlyExpenses)).toBeVisible();
    await expect(page.getByText(copy.dailyBudget.dailyCeiling)).toBeVisible();
  });

  test("redirects legacy previsao route", async ({ page }) => {
    await page.goto("/menu/previsao-diario");
    await expect(page).toHaveURL(/\/gastos-fixos\/orcamento-diario$/);
  });
});
