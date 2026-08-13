import { format } from "date-fns";
import { MapaFinanceiroView } from "@/components/commitments/MapaFinanceiroView";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getDailyCeiling } from "@/lib/services/fixed-expenses";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { getRecurringByUser } from "@/lib/services/recurring";
import { getTransactionsByMonth } from "@/lib/services/transactions";
import { redirect } from "next/navigation";

interface MapaFinanceiroPageProps {
  searchParams: Promise<{ year?: string; month?: string; view?: string }>;
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

  const [items, ceiling, categories, monthData] = await Promise.all([
    getRecurringByUser(session.user.id),
    getDailyCeiling(session.user.id),
    getCategoriesByUser(session.user.id),
    getTransactionsByMonth(session.user.id, year, month),
  ]);

  return (
    <div className="space-y-[var(--section-gap)] pb-8">
      <PageHeader
        title={copy.mapaFinanceiro.title}
        description={copy.mapaFinanceiro.subtitle}
      />
      <MapaFinanceiroView
        key={`${year}-${month}`}
        recurrings={items}
        variableEstimate={ceiling.totalFixed}
        categories={categories}
        initialTransactions={monthData.events}
        year={year}
        month={month}
        today={today}
        initialView={initialView}
      />
    </div>
  );
}
