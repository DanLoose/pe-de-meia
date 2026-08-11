import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { getCategoriesByUser } from "@/lib/services/categories";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const categories = await getCategoriesByUser(session.user.id);

  return (
    <AppShell userEmail={session.user.email ?? ""} categories={categories}>
      {children}
    </AppShell>
  );
}
