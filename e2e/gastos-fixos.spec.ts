import { expect, test } from "@playwright/test";
import { copy } from "../src/lib/copy";
import { loginAsDemo } from "./helpers";

test.describe("Compromissos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("shows contas fixas tab and create flow", async ({ page }) => {
    await page.goto("/gastos-fixos");
    await expect(
      page.getByRole("heading", { name: copy.gastosFixos.title }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: copy.gastosFixos.tabFixed }),
    ).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: copy.fixedExpenses.new }).click();
    await expect(
      page.getByRole("heading", { name: copy.fixedExpenses.new }),
    ).toBeVisible();
  });

  test("redirects legacy recorrentes route", async ({ page }) => {
    await page.goto("/recorrentes");
    await expect(page).toHaveURL(/\/gastos-fixos$/);
  });
});
