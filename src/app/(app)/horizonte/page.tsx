import { format } from "date-fns";
import { HorizonGrid } from "@/components/horizon/HorizonGrid";
import { PageHeader } from "@/components/layout/PageHeader";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getHorizon } from "@/lib/services/horizon";
import { redirect } from "next/navigation";

export default async function HorizontePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const horizon = await getHorizon(session.user.id, today, 3);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.horizon.title}
        description={copy.horizon.subtitle}
      />
      <HorizonGrid data={horizon} />
    </div>
  );
}
