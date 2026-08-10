import { logoutAction } from "@/app/actions/auth";
import { AppNav } from "@/components/layout/AppNav";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

interface AppShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <div className="min-h-full bg-muted/20">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <BrandLogo />
            <AppNav />
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden max-w-[200px] truncate text-sm text-muted-foreground sm:block">
              {userEmail}
            </p>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                {copy.auth.signOut}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
