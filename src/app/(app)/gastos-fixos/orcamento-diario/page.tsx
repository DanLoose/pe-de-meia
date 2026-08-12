import { DailyForecastManager } from "@/components/forecast/DailyForecastManager";
import { auth } from "@/lib/auth";
import { getDailyForecast } from "@/lib/services/fixed-expenses";
import { redirect } from "next/navigation";

export default async function OrcamentoDiarioPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const forecast = await getDailyForecast(session.user.id);

  return <DailyForecastManager initialData={forecast} />;
}
