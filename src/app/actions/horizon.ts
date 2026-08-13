"use server";

import { getSessionUserId } from "@/lib/auth";
import { getHorizon, getHorizonDayCell } from "@/lib/services/horizon";
import type { ActionResult, HorizonData, HorizonDayCell } from "@/types";

export async function fetchHorizonAction(
  startDate: string,
  months = 12,
  includeVariableEstimate = true,
): Promise<ActionResult<HorizonData>> {
  try {
    const userId = await getSessionUserId();
    const data = await getHorizon(userId, startDate, months, {
      includeVariableEstimate,
    });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o horizonte",
    };
  }
}

export async function fetchHorizonDayAction(
  date: string,
  today: string,
  includeVariableEstimate = true,
): Promise<ActionResult<HorizonDayCell>> {
  try {
    const userId = await getSessionUserId();
    const data = await getHorizonDayCell(
      userId,
      date,
      today,
      includeVariableEstimate,
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o dia",
    };
  }
}
