import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { loginAsDemo } from "./helpers";

test.describe("Previsão de diário", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows domain-aligned intro and budget labels", async ({ page }) => {
    await page.goto("/menu/previsao-diario");
    await expect(
      page.getByRole("heading", { name: copy.forecast.title }),
    ).toBeVisible();
    await expect(page.getByText(copy.forecast.intro)).toBeVisible();
    await expect(page.getByText(copy.forecast.subtitle)).toBeVisible();
    await expect(page.getByText(copy.forecast.monthlyExpenses)).toBeVisible();
    await expect(page.getByText(copy.forecast.dailyCeiling)).toBeVisible();
  });
});
