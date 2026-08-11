import { RecurringManager } from "@/components/recurring/RecurringManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getRecurringByUser } from "@/lib/services/recurring";
import { redirect } from "next/navigation";

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [items, categories] = await Promise.all([
    getRecurringByUser(session.user.id),
    getCategoriesByUser(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.recurring.title}
        description={copy.recurring.subtitle}
      />
      <RecurringManager items={items} categories={categories} />
    </div>
  );
}
