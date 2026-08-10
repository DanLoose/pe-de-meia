"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import {
  getBudgetsForMonth,
  upsertCategoryBudget,
} from "@/lib/services/budgets";
import type { ActionResult, CategoryBudgetDTO } from "@/types";

function revalidateApp() {
  revalidatePath("/calendar");
  revalidatePath("/categories");
}

export async function fetchBudgetsAction(
  year: number,
  month: number,
): Promise<ActionResult<CategoryBudgetDTO[]>> {
  try {
    const userId = await getSessionUserId();
    const data = await getBudgetsForMonth(userId, year, month);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load budgets",
    };
  }
}

export async function upsertBudgetAction(
  input: unknown,
): Promise<ActionResult<CategoryBudgetDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await upsertCategoryBudget(userId, input);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save budget",
    };
  }
}
