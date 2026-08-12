import { AppSidebar } from "@/components/layout/AppSidebar";

interface AppShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-muted/20">
      <AppSidebar userEmail={userEmail} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-[var(--page-padding-x)] py-[var(--page-padding-y)] sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
