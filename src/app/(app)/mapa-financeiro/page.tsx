import { format } from "date-fns";
import { MapaFinanceiroView } from "@/components/commitments/MapaFinanceiroView";
import { auth } from "@/lib/auth";
import { formatDateOnly, getMonthDateRange } from "@/lib/dates";
import { daysInMonth } from "@/lib/mapa-snapshot";
import { mapaCardLookbackStart } from "@/lib/mapa-card-invoice";
import { getCardPurchaseCharges } from "@/lib/services/card";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import { getMapaMonthSnapshot, getMapaYearHeat } from "@/lib/services/mapa";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { getRecurringByUser } from "@/lib/services/recurring";
import { getTransactionsByMonth } from "@/lib/services/transactions";
import { getUserSettings } from "@/lib/services/user-settings";
import { redirect } from "next/navigation";

interface MapaFinanceiroPageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
    day?: string;
    view?: string;
  }>;
}

function resolveDayParam(
  year: number,
  month: number,
  dayParam: string | undefined,
): string | null {
  if (!dayParam) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
    const [y, m] = dayParam.split("-").map(Number);
    if (y === year && m === month) return dayParam;
    return null;
  }
  const n = Number(dayParam);
  if (!Number.isFinite(n) || n < 1) return null;
  const day = Math.min(n, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default async function MapaFinanceiroPage({
  searchParams,
}: MapaFinanceiroPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const onboardingStatus = await getOnboardingStatus(session.user.id);
  if (onboardingStatus.needsOnboarding) {
    redirect("/comecar");
  }

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const today = format(now, "yyyy-MM-dd");
  const initialView = params.view === "lista" ? "lista" : "mapa";
  const initialDay = resolveDayParam(year, month, params.day);

  const [items, ceiling, categories, monthData, settings, snapshot, yearHeat] =
    await Promise.all([
      getRecurringByUser(session.user.id),
      getDailyCeiling(session.user.id),
      getCategoriesByUser(session.user.id),
      getTransactionsByMonth(session.user.id, year, month),
      getUserSettings(session.user.id),
      getMapaMonthSnapshot(session.user.id, year, month, today),
      getMapaYearHeat(session.user.id, year, today),
    ]);

  const { start: monthStart } = getMonthDateRange(year, month);
  const lookbackStart = mapaCardLookbackStart(
    year,
    month,
    settings.cardClosingDay,
    settings.cardDueDay,
  );
  const monthStartStr = formatDateOnly(monthStart);
  const dayBeforeMonth = formatDateOnly(
    new Date(monthStart.getTime() - 24 * 60 * 60 * 1000),
  );
  const priorCardCharges =
    lookbackStart < monthStartStr
      ? await getCardPurchaseCharges(
          session.user.id,
          lookbackStart,
          dayBeforeMonth,
        )
      : [];

  return (
    <div className="space-y-[var(--section-gap)] pb-8">
      <MapaFinanceiroView
        key={`${year}-${month}`}
        recurrings={items}
        variableEstimate={ceiling.totalFixed}
        categories={categories}
        initialTransactions={monthData.events}
        year={year}
        month={month}
        today={today}
        cardDueDay={settings.cardDueDay}
        cardClosingDay={settings.cardClosingDay}
        priorCardCharges={priorCardCharges}
        initialView={initialView}
        initialDay={initialDay}
        snapshot={snapshot}
        initialYearHeat={yearHeat}
      />
    </div>
  );
}
