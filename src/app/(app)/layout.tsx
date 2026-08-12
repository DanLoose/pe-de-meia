import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname") ?? "/saldos";

  return (
    <AppShell userEmail={session.user.email ?? ""} pathname={pathname}>
      {children}
    </AppShell>
  );
}
