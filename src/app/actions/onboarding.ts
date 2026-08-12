"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import {
  completeOnboarding,
  getOnboardingStatus,
} from "@/lib/services/onboarding";
import type { ActionResult, OnboardingStatus } from "@/types";

function revalidateOnboarding() {
  revalidatePath("/comecar");
  revalidatePath("/saldos");
  revalidatePath("/totais");
  revalidatePath("/menu");
}

export async function fetchOnboardingStatusAction(): Promise<
  ActionResult<OnboardingStatus>
> {
  try {
    const userId = await getSessionUserId();
    const data = await getOnboardingStatus(userId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o status de onboarding",
    };
  }
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const userId = await getSessionUserId();
    await completeOnboarding(userId);
    revalidateOnboarding();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o setup",
    };
  }
}

export async function skipOnboardingAction(): Promise<void> {
  const userId = await getSessionUserId();
  await completeOnboarding(userId);
  revalidateOnboarding();
  redirect("/totais");
}
