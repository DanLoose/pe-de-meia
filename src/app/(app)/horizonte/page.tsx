import { format } from "date-fns";
import { HorizonView } from "@/components/horizon/HorizonView";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getHorizon } from "@/lib/services/horizon";
import { redirect } from "next/navigation";

interface HorizontePageProps {
  searchParams: Promise<{ months?: string }>;
}

export default async function HorizontePage({ searchParams }: HorizontePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const parsedMonths = Number(params.months ?? "3");
  const months = [3, 6, 12].includes(parsedMonths) ? parsedMonths : 3;
  const today = format(new Date(), "yyyy-MM-dd");
  const horizon = await getHorizon(session.user.id, today, months);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.horizon.title}
        description={copy.horizon.subtitle}
      />
      <HorizonView initialData={horizon} initialMonths={months} />
    </div>
  );
}
