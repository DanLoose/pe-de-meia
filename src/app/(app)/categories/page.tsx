import { CategoryManager } from "@/components/categories/CategoryManager";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getBudgetsForMonth } from "@/lib/services/budgets";
import { getCategoriesByUser } from "@/lib/services/categories";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [categories, budgets] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getBudgetsForMonth(session.user.id, year, month),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {copy.categories.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.categories.subtitle}</p>
      </div>
      <CategoryManager
        categories={categories}
        budgets={budgets}
        year={year}
        month={month}
      />
    </div>
  );
}
