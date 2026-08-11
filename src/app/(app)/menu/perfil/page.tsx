import { ProfileFormClient } from "@/components/menu/ProfileFormClient";
import { auth } from "@/lib/auth";
import { getUserSettings } from "@/lib/services/user-settings";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const settings = await getUserSettings(session.user.id);

  return <ProfileFormClient settings={settings} />;
}
