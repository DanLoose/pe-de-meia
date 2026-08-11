"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserId } from "@/lib/auth";
import { getMonthTotals } from "@/lib/services/totals";
import type { ActionResult, MonthTotalsData } from "@/types";

export async function fetchMonthTotalsAction(
  year: number,
  month: number,
): Promise<ActionResult<MonthTotalsData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getMonthTotals(userId, year, month);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível carregar os totais",
    };
  }
}

export async function revalidateTotalsPaths() {
  revalidatePath("/totais");
  revalidatePath("/saldos");
}
