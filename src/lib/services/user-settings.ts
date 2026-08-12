import { prisma } from "@/lib/db";
import {
  ensureCardAccount,
  updateCardAccount,
} from "@/lib/services/card";
import type { UserSettingsDTO } from "@/types";

export async function getUserSettings(userId: string): Promise<UserSettingsDTO> {
  const [user, cardAccount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        openingBalance: true,
        dailyDivisor: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    }),
    ensureCardAccount(userId),
  ]);

  return {
    name: user.name,
    email: user.email,
    openingBalance: Number(user.openingBalance),
    dailyDivisor: user.dailyDivisor,
    cardClosingDay: cardAccount.closingDay,
    cardDueDay: cardAccount.dueDay,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEndsAt: user.subscriptionEndsAt
      ? user.subscriptionEndsAt.toISOString()
      : null,
  };
}

export async function updateUserSettings(
  userId: string,
  input: {
    openingBalance?: number;
    dailyDivisor?: number;
    name?: string;
    cardClosingDay?: number;
    cardDueDay?: number;
  },
): Promise<UserSettingsDTO> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.openingBalance !== undefined
        ? { openingBalance: input.openingBalance }
        : {}),
      ...(input.dailyDivisor !== undefined
        ? { dailyDivisor: input.dailyDivisor }
        : {}),
      ...(input.name !== undefined ? { name: input.name.trim() || null } : {}),
    },
  });

  if (
    input.cardClosingDay !== undefined ||
    input.cardDueDay !== undefined
  ) {
    const account = await ensureCardAccount(userId);
    await updateCardAccount(userId, {
      closingDay: input.cardClosingDay ?? account.closingDay,
      dueDay: input.cardDueDay ?? account.dueDay,
    });
  }

  return getUserSettings(userId);
}
