"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import {
  createRecurring,
  deleteRecurring,
  getRecurringByUser,
  toggleRecurringActive,
  updateRecurring,
} from "@/lib/services/recurring";
import type { ActionResult, RecurringTransactionDTO } from "@/types";

function revalidateApp() {
  revalidatePath("/saldos");
  revalidatePath("/comecar");
  revalidatePath("/totais");
  revalidatePath("/horizonte");
  revalidatePath("/extrato");
  revalidatePath("/calendario");
  revalidatePath("/calendar");
  revalidatePath("/gastos-fixos");
  revalidatePath("/mapa-financeiro");
  revalidatePath("/recorrentes");
  revalidatePath("/recurring");
}

export async function fetchRecurringAction(): Promise<
  ActionResult<RecurringTransactionDTO[]>
> {
  try {
    const userId = await getSessionUserId();
    const data = await getRecurringByUser(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load recurring",
    };
  }
}

export async function createRecurringAction(
  input: unknown,
): Promise<ActionResult<RecurringTransactionDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await createRecurring(userId, input);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create recurring",
    };
  }
}

export async function updateRecurringAction(
  input: unknown,
): Promise<ActionResult<RecurringTransactionDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await updateRecurring(userId, input);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update recurring",
    };
  }
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    await deleteRecurring(userId, id);
    revalidateApp();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete recurring",
    };
  }
}

export async function toggleRecurringAction(
  id: string,
  active: boolean,
): Promise<ActionResult<RecurringTransactionDTO>> {
  try {
    const userId = await getSessionUserId();
    const data = await toggleRecurringActive(userId, id, active);
    revalidateApp();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update recurring",
    };
  }
}
