import { ExtratoView } from "@/components/extrato/ExtratoView";
import { auth } from "@/lib/auth";
import { getTransactionsByMonth } from "@/lib/services/transactions";
import { redirect } from "next/navigation";

interface ExtratoPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function ExtratoPage({ searchParams }: ExtratoPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? Number(params.year) : now.getFullYear();
  const month = params.month ? Number(params.month) : now.getMonth() + 1;

  const monthData = await getTransactionsByMonth(
    session.user.id,
    year,
    month,
  );

  return (
    <ExtratoView
      key={`${year}-${month}`}
      year={year}
      month={month}
      initialTransactions={monthData.events}
    />
  );
}
