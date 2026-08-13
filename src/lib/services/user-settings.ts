import { format } from "date-fns";
import { prisma } from "@/lib/db";
import {
  ensureCardAccount,
  updateCardAccount,
} from "@/lib/services/card";
import {
  getLedgerMonth,
  getUserOpeningBalance,
} from "@/lib/services/ledger";
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

/** Checking-account balance as of a date (matches Projeção / ledger for that day). */
export async function getAvailableBalance(
  userId: string,
  asOfDate = format(new Date(), "yyyy-MM-dd"),
): Promise<number> {
  const [year, month] = asOfDate.split("-").map(Number);
  const opening = await getUserOpeningBalance(userId);
  const ledger = await getLedgerMonth(userId, year, month, opening);
  const row = ledger.rows.find((day) => day.date === asOfDate);
  return row?.balance ?? opening;
}

/**
 * Sets the cash available in the account as of `asOfDate` by adjusting
 * openingBalance so the computed ledger balance matches `amount`.
 */
export async function setAvailableBalance(
  userId: string,
  amount: number,
  asOfDate = format(new Date(), "yyyy-MM-dd"),
): Promise<UserSettingsDTO> {
  const opening = await getUserOpeningBalance(userId);
  const current = await getAvailableBalance(userId, asOfDate);
  const nextOpening = opening + (amount - current);
  return updateUserSettings(userId, { openingBalance: nextOpening });
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
