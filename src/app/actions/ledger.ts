"use server";

import { getSessionUserId } from "@/lib/auth";
import { getLedgerMonth } from "@/lib/services/ledger";
import type { ActionResult, LedgerMonthData } from "@/types";

export async function fetchLedgerMonthAction(
  year: number,
  month: number,
): Promise<ActionResult<LedgerMonthData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getLedgerMonth(userId, year, month);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível carregar a planilha",
    };
  }
}
