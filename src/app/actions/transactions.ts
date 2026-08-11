"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import {
  createTransaction,
  deleteTransaction,
  getTransactionsByDate,
  getTransactionsByDateRange,
  getTransactionsByMonth,
  updateTransaction,
} from "@/lib/services/transactions";
import {
  createTransactionSchema,
  deleteTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validators/transaction";
import type {
  ActionResult,
  CategoryDTO,
  MonthData,
  TransactionDTO,
} from "@/types";

function revalidateFinancePaths() {
  revalidatePath("/saldos");
  revalidatePath("/totais");
  revalidatePath("/horizonte");
  revalidatePath("/calendario");
  revalidatePath("/calendar");
}

export async function fetchMonthDataAction(
  year: number,
  month: number,
): Promise<ActionResult<MonthData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getTransactionsByMonth(userId, year, month);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load month data",
    };
  }
}

export async function fetchVisibleRangeDataAction(
  start: string,
  end: string,
): Promise<ActionResult<MonthData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getTransactionsByDateRange(userId, start, end);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load calendar data",
    };
  }
}

export async function fetchDayTransactionsAction(
  date: string,
  typeFilter?: "INCOME" | "EXPENSE" | "ALL",
): Promise<ActionResult<TransactionDTO[]>> {
  try {
    const userId = await getSessionUserId();
    let data = await getTransactionsByDate(userId, date);
    if (typeFilter && typeFilter !== "ALL") {
      data = data.filter((tx) => tx.type === typeFilter);
    }
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load day data",
    };
  }
}

export async function fetchCategoriesAction(): Promise<ActionResult<CategoryDTO[]>> {
  try {
    const userId = await getSessionUserId();
    const data = await getCategoriesByUser(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load categories",
    };
  }
}

export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult<TransactionDTO>> {
  try {
    const userId = await getSessionUserId();
    const parsed = createTransactionSchema.parse(input);
    const data = await createTransaction(userId, parsed);
    revalidateFinancePaths();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

export async function updateTransactionAction(
  input: unknown,
): Promise<ActionResult<TransactionDTO>> {
  try {
    const userId = await getSessionUserId();
    const parsed = updateTransactionSchema.parse(input);
    const data = await updateTransaction(userId, parsed);
    revalidateFinancePaths();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update transaction",
    };
  }
}

export async function deleteTransactionAction(
  id: string,
): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    const parsed = deleteTransactionSchema.parse({ id });
    await deleteTransaction(userId, parsed.id);
    revalidateFinancePaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete transaction",
    };
  }
}
