"use server";

import { getSessionUserId } from "@/lib/auth";
import { getMapaYearHeat } from "@/lib/services/mapa";
import type { ActionResult, MapaYearMonthHeat } from "@/types";

export async function fetchMapaYearHeatAction(
  year: number,
  today: string,
): Promise<ActionResult<MapaYearMonthHeat[]>> {
  try {
    const userId = await getSessionUserId();
    const data = await getMapaYearHeat(userId, year, today);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o ano",
    };
  }
}
