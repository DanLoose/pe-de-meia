import type { Page } from "@playwright/test";
import { copy } from "../src/lib/copy";

export const DEMO_EMAIL = "demo@pedemeia.dev";
export const DEMO_PASSWORD = "password123";

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByLabel(copy.auth.email).fill(DEMO_EMAIL);
  await page.getByLabel(copy.auth.password).fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("/saldos");
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
  await page.getByRole("heading", { name: copy.entry.new }).waitFor();

  const amountField = page.getByTestId("entry-amount");
  await amountField.click();
  await amountField.pressSequentially(options.amount);
  await page.getByTestId("entry-date").fill(options.date);
  await page.getByTestId("entry-description").fill(options.description);
  await page.getByTestId("entry-submit").click();
  await page.getByRole("heading", { name: copy.entry.new }).waitFor({
    state: "hidden",
  });
}
