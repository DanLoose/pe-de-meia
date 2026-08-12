import { format } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { TotalsDashboard } from "@/components/totals/TotalsDashboard";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getMonthTotals } from "@/lib/services/totals";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { redirect } from "next/navigation";

interface TotaisPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function TotaisPage({ searchParams }: TotaisPageProps) {
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

  const totals = await getMonthTotals(session.user.id, year, month);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader title={copy.totals.title} description={copy.totals.subtitle} />
      <TotalsDashboard data={totals} today={today} />
    </div>
  );
}
