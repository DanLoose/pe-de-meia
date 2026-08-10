import { redirect } from "next/navigation";
import { FinanceCalendar } from "@/components/calendar/FinanceCalendar";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getTransactionsByMonth } from "@/lib/services/transactions";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [categories, monthData] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getTransactionsByMonth(session.user.id, year, month),
  ]);

  return (
    <AppShell userEmail={session.user.email ?? ""}>
      <FinanceCalendar
        categories={categories}
        initialSummaries={monthData.dailySummaries}
      />
    </AppShell>
  );
}
