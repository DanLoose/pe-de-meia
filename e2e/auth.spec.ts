import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, loginAsDemo } from "./helpers";
import { copy } from "../src/lib/copy";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with demo credentials", async ({ page }) => {
    await loginAsDemo(page);

    await expect(
      page.getByRole("heading", { name: copy.calendarTitle }),
    ).toBeVisible();
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
  });

  test("registers a new account", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@pedemeia.dev`;

    await page.goto("/register");
    await page.getByLabel(copy.auth.name).fill("E2E User");
    await page.getByLabel(copy.auth.email).fill(uniqueEmail);
    await page.getByLabel(copy.auth.password).fill("password123");
    await page.getByRole("button", { name: copy.auth.createAccount }).click();

    await page.waitForURL("/calendar");
    await expect(
      page.getByRole("heading", { name: copy.calendarTitle }),
    ).toBeVisible();
  });
});
