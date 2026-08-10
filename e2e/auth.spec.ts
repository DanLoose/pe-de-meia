import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, loginAsDemo } from "./helpers";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in with demo credentials", async ({ page }) => {
    await loginAsDemo(page);

    await expect(page.getByRole("heading", { name: "Finance Calendar" })).toBeVisible();
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
  });

  test("registers a new account", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@pedemeia.dev`;

    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("/calendar");
    await expect(page.getByRole("heading", { name: "Finance Calendar" })).toBeVisible();
  });
});
