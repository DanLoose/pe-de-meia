import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { FinanceCalendar } from "@/components/calendar/FinanceCalendar";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="font-medium">{session.user.email}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </header>

      <FinanceCalendar
        categories={categories}
        initialSummaries={monthData.dailySummaries}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
