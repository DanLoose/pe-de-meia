"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import {
  createFixedExpense,
  deleteFixedExpense,
  getDailyForecast,
  updateDailyDivisor,
  updateFixedExpense,
} from "@/lib/services/fixed-expenses";
import type { ActionResult, DailyForecastData, FixedExpenseDTO } from "@/types";

export async function fetchFixedExpensesAction(): Promise<
  ActionResult<DailyForecastData>
> {
  try {
    const userId = await getSessionUserId();
    const data = await getDailyForecast(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível carregar a previsão de diário",
    };
  }
}

export async function upsertFixedExpenseAction(
  input: unknown,
): Promise<ActionResult<FixedExpenseDTO>> {
  try {
    const userId = await getSessionUserId();
    const parsed = z
      .object({
        id: z.string().optional(),
        name: z.string().trim().min(1),
        amount: z.coerce.number().positive(),
      })
      .parse(input);

    const data = parsed.id
      ? await updateFixedExpense(userId, {
          id: parsed.id,
          name: parsed.name,
          amount: parsed.amount,
        })
      : await createFixedExpense(userId, {
          name: parsed.name,
          amount: parsed.amount,
        });

    revalidatePath("/gastos-fixos/orcamento-diario");
    revalidatePath("/menu/previsao-diario");
    revalidatePath("/comecar");
    revalidatePath("/totais");
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível salvar o gasto fixo",
    };
  }
}

export async function deleteFixedExpenseAction(
  id: string,
): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    await deleteFixedExpense(userId, id);
    revalidatePath("/gastos-fixos/orcamento-diario");
    revalidatePath("/menu/previsao-diario");
    revalidatePath("/comecar");
    revalidatePath("/totais");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível excluir o gasto fixo",
    };
  }
}

export async function updateDailyDivisorAction(
  dailyDivisor: number,
): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    if (dailyDivisor < 1 || dailyDivisor > 31) {
      return { success: false, error: "Divisor deve ser entre 1 e 31" };
    }
    await updateDailyDivisor(userId, dailyDivisor);
    revalidatePath("/gastos-fixos/orcamento-diario");
    revalidatePath("/menu/previsao-diario");
    revalidatePath("/comecar");
    revalidatePath("/totais");
    revalidatePath("/menu/configuracoes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Não foi possível atualizar o divisor",
    };
  }
}
