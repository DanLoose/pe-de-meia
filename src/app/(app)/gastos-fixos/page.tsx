import { CompromissosStudio } from "@/components/commitments/CompromissosStudio";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getDailyForecast } from "@/lib/services/fixed-expenses";
import { getRecurringByUser } from "@/lib/services/recurring";
import { redirect } from "next/navigation";

interface GastosFixosPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function GastosFixosPage({
  searchParams,
}: GastosFixosPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialTab =
    params.tab === "variaveis" || params.tab === "variáveis"
      ? "variaveis"
      : "fixos";

  const [items, categories, forecast] = await Promise.all([
    getRecurringByUser(session.user.id),
    getCategoriesByUser(session.user.id),
    getDailyForecast(session.user.id),
  ]);

  return (
    <CompromissosStudio
      initialRecurrings={items}
      categories={categories}
      initialForecast={forecast}
      initialTab={initialTab}
    />
  );
}
