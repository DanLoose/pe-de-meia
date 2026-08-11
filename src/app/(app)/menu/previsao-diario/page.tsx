import { PageHeader } from "@/components/layout/PageHeader";
import { DailyForecastManager } from "@/components/forecast/DailyForecastManager";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getDailyForecast } from "@/lib/services/fixed-expenses";
import { redirect } from "next/navigation";

export default async function PrevisaoDiarioPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const forecast = await getDailyForecast(session.user.id);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.forecast.title}
        description={copy.forecast.subtitle}
      />
      <DailyForecastManager initialData={forecast} />
    </div>
  );
}
