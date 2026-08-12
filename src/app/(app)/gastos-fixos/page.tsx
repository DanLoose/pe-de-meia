import { RecurringManager } from "@/components/recurring/RecurringManager";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getRecurringByUser } from "@/lib/services/recurring";
import { redirect } from "next/navigation";

export default async function GastosFixosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [items, categories] = await Promise.all([
    getRecurringByUser(session.user.id),
    getCategoriesByUser(session.user.id),
  ]);

  return <RecurringManager items={items} categories={categories} />;
}
