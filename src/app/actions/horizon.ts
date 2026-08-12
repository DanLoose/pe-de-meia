"use server";

import { getSessionUserId } from "@/lib/auth";
import { getHorizon } from "@/lib/services/horizon";
import type { ActionResult, HorizonData } from "@/types";

export async function fetchHorizonAction(
  startDate: string,
  months = 3,
): Promise<ActionResult<HorizonData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getHorizon(userId, startDate, months);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível carregar o horizonte",
    };
  }
}
