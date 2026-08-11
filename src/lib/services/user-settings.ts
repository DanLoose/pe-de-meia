import { prisma } from "@/lib/db";
import type { UserSettingsDTO } from "@/types";

export async function getUserSettings(userId: string): Promise<UserSettingsDTO> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      openingBalance: true,
      dailyDivisor: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });

  return {
    name: user.name,
    email: user.email,
    openingBalance: Number(user.openingBalance),
    dailyDivisor: user.dailyDivisor,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEndsAt: user.subscriptionEndsAt
      ? user.subscriptionEndsAt.toISOString()
      : null,
  };
}

export async function updateUserSettings(
  userId: string,
  input: { openingBalance?: number; dailyDivisor?: number; name?: string },
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

  return getUserSettings(userId);
}
