import { AppSidebar } from "@/components/layout/AppSidebar";
import type { CategoryDTO } from "@/types";

interface AppShellProps {
  userEmail: string;
  categories: CategoryDTO[];
  children: React.ReactNode;
}

export function AppShell({ userEmail, categories, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh w-full bg-muted/20">
      <AppSidebar userEmail={userEmail} categories={categories} />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-[var(--page-padding-x)] py-[var(--page-padding-y)] sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
