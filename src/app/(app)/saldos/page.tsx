import { format } from "date-fns";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getLedgerMonth } from "@/lib/services/ledger";
import { redirect } from "next/navigation";

interface SaldosPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function SaldosPage({ searchParams }: SaldosPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;
  const today = format(now, "yyyy-MM-dd");

  const [categories, ledgerData] = await Promise.all([
    getCategoriesByUser(session.user.id),
    getLedgerMonth(session.user.id, year, month),
  ]);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader title={copy.ledger.title} description={copy.ledger.subtitle} />
      <LedgerTable
        key={`${year}-${month}`}
        initialData={ledgerData}
        categories={categories}
        today={today}
      />
    </div>
  );
}
