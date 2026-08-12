import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getBudgetsForMonth } from "@/lib/services/budgets";
import { getCategoriesByUser } from "@/lib/services/categories";
import { redirect } from "next/navigation";

export default async function TagsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const [categories, budgets] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getBudgetsForMonth(session.user.id, year, month),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.categories.title}
        description={copy.categories.subtitle}
      />
      <p className="text-sm text-muted-foreground">{copy.categories.intro}</p>
      <CategoryManager
        categories={categories}
        budgets={budgets}
        year={year}
        month={month}
        monthLabel={monthLabel}
      />
    </div>
  );
}
