import type { Page } from "@playwright/test";

export const DEMO_EMAIL = "demo@pedemeia.dev";
export const DEMO_PASSWORD = "password123";

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/calendar");
}

export async function createExpenseEntry(
  page: Page,
  options: {
    amount: string;
    date: string;
    description: string;
  },
) {
  await page.getByTestId("new-entry-button").click();
  await page.getByRole("heading", { name: "New entry" }).waitFor();

  await page.getByTestId("entry-amount").fill(options.amount);
  await page.getByTestId("entry-date").fill(options.date);
  await page.getByTestId("entry-description").fill(options.description);
  await page.getByTestId("entry-submit").click();
  await page.getByRole("heading", { name: "New entry" }).waitFor({ state: "hidden" });
}
