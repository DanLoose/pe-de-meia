import { format } from "date-fns";
import { FinanceCalendar } from "@/components/calendar/FinanceCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getTransactionsByMonth } from "@/lib/services/transactions";
import { redirect } from "next/navigation";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = format(now, "yyyy-MM-dd");

  const [categories, monthData] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getTransactionsByMonth(session.user.id, year, month),
  ]);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.calendarTitle}
        description={copy.calendarSubtitle}
      />
      <FinanceCalendar
        categories={categories}
        initialSummaries={monthData.dailySummaries}
        initialBudgetSummary={monthData.budgetSummary ?? null}
        today={today}
      />
    </div>
  );
}
