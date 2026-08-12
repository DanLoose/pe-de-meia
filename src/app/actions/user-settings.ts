"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { CARD_DAY_MAX, CARD_DAY_MIN } from "@/lib/card-cycle";
import {
  getUserSettings,
  updateUserSettings,
} from "@/lib/services/user-settings";
import type { ActionResult, UserSettingsDTO } from "@/types";

const cardDaySchema = z.coerce
  .number()
  .int()
  .min(CARD_DAY_MIN)
  .max(CARD_DAY_MAX);

const settingsSchema = z.object({
  openingBalance: z.coerce.number().optional(),
  dailyDivisor: z.coerce.number().int().min(1).max(31).optional(),
  name: z.string().trim().min(2).optional(),
  cardClosingDay: cardDaySchema.optional(),
  cardDueDay: cardDaySchema.optional(),
});

export async function fetchUserSettingsAction(): Promise<
  ActionResult<UserSettingsDTO>
> {
  try {
    const userId = await getSessionUserId();
    const data = await getUserSettings(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível carregar as configurações",
    };
  }
}

export async function updateUserSettingsAction(
  input: unknown,
): Promise<ActionResult<UserSettingsDTO>> {
  try {
    const userId = await getSessionUserId();
    const parsed = settingsSchema.parse(input);
    const data = await updateUserSettings(userId, parsed);

    revalidatePath("/menu");
    revalidatePath("/menu/configuracoes");
    revalidatePath("/menu/perfil");
    revalidatePath("/saldos");
    revalidatePath("/horizonte");
    revalidatePath("/totais");

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações",
    };
  }
}
