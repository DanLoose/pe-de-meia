import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsForm } from "@/components/menu/SettingsForm";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import {
  getAvailableBalance,
  getUserSettings,
} from "@/lib/services/user-settings";
import { redirect } from "next/navigation";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [settings, availableBalance] = await Promise.all([
    getUserSettings(session.user.id),
    getAvailableBalance(session.user.id),
  ]);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.settings.title}
        description={copy.settings.subtitle}
        backHref="/menu"
        backLabel={copy.menu.back}
      />
      <SettingsForm
        settings={settings}
        availableBalance={availableBalance}
      />
    </div>
  );
}
