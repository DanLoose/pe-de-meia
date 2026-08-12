import { prisma } from "@/lib/db";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import type { OnboardingStatus } from "@/types";

export async function getOnboardingStatus(
  userId: string,
): Promise<OnboardingStatus> {
  const [user, transactionCount, recurringCount, dailyCeiling] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { openingBalance: true, onboardingCompletedAt: true },
      }),
      prisma.transaction.count({ where: { userId } }),
      prisma.recurringTransaction.count({
        where: { userId, active: true },
      }),
      getDailyCeiling(userId),
    ]);

  const hasOpeningBalance = Number(user.openingBalance) !== 0;
  const hasRecurring = recurringCount > 0;
  const hasDailyForecast = dailyCeiling.totalFixed > 0;
  const hasTransactions = transactionCount > 0;

  const needsOnboarding =
    user.onboardingCompletedAt === null &&
    !hasOpeningBalance &&
    !hasRecurring &&
    !hasDailyForecast &&
    !hasTransactions;

  return {
    needsOnboarding,
    hasOpeningBalance,
    hasRecurring,
    hasDailyForecast,
    hasTransactions,
  };
}

export async function completeOnboarding(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });
}
