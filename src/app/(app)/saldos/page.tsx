import { format } from "date-fns";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { SaldosEmptyHint } from "@/components/ledger/SaldosEmptyHint";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getLedgerMonth } from "@/lib/services/ledger";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import type { LedgerMonthData } from "@/types";
import { redirect } from "next/navigation";

interface SaldosPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

function ledgerHasUserActivity(ledger: LedgerMonthData): boolean {
  return ledger.rows.some(
    (row) =>
      row.income > 0 ||
      row.expense > 0 ||
      row.daily > 0 ||
      row.savings > 0 ||
      row.card > 0,
  );
}

export default async function SaldosPage({ searchParams }: SaldosPageProps) {
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

  const [categories, ledgerData] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getLedgerMonth(session.user.id, year, month),
  ]);

  const showEmptyHint = !ledgerHasUserActivity(ledgerData);

  return (
    <div className="flex h-[calc(100dvh-2*var(--page-padding-y))] max-md:h-[calc(100dvh-3.5rem-2*var(--page-padding-y))] flex-col gap-[var(--section-gap)] overflow-hidden">
      <PageHeader title={copy.ledger.title} description={copy.ledger.subtitle} />
      {showEmptyHint ? <SaldosEmptyHint /> : null}
      <LedgerTable
        key={`${year}-${month}`}
        initialData={ledgerData}
        categories={categories}
        today={today}
      />
    </div>
  );
}
