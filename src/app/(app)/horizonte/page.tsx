import { format } from "date-fns";
import { HorizonView } from "@/components/horizon/HorizonView";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getHorizon } from "@/lib/services/horizon";
import { redirect } from "next/navigation";

const HORIZON_MONTHS = 12;

export default async function HorizontePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const [horizon, categories] = await Promise.all([
    getHorizon(session.user.id, today, HORIZON_MONTHS),
    getCategoriesByUser(session.user.id),
  ]);

  return (
    <HorizonView
      key={today}
      initialData={horizon}
      categories={categories}
    />
  );
}
