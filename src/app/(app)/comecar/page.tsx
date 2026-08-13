import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { getUserSettings } from "@/lib/services/user-settings";

export default async function ComecarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [status, settings, categories] = await Promise.all([
    getOnboardingStatus(session.user.id),
    getUserSettings(session.user.id),
    getCategoriesByUser(session.user.id),
  ]);

  if (status.wizardCompleted) {
    redirect("/mapa-financeiro");
  }

  return (
    <OnboardingWizard
      categories={categories}
      initialOpeningBalance={settings.openingBalance}
      initialCardClosingDay={settings.cardClosingDay}
      initialCardDueDay={settings.cardDueDay}
    />
  );
}
