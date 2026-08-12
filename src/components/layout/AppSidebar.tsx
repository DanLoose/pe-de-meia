"use client";

import { Menu, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { AppSidebarNav } from "@/components/layout/AppSidebarNav";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { copy } from "@/lib/copy";
import {
  isSidebarCollapsed,
  setSidebarCollapsed,
  subscribeSidebarCollapsed,
} from "@/lib/sidebar-prefs";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userEmail: string;
}

function useSidebarCollapsed() {
  return useSyncExternalStore(
    subscribeSidebarCollapsed,
    isSidebarCollapsed,
    () => false,
  );
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (options: { collapsed?: boolean; mobile?: boolean }) => {
    const isCollapsed = options.mobile ? false : options.collapsed;

    return (
      <>
        <div
          className={cn(
            "border-b px-4 py-4",
            isCollapsed && "flex justify-center px-2",
          )}
        >
          <BrandLogo compact={isCollapsed} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
          <AppSidebarNav
            collapsed={isCollapsed}
            onNavigate={options.mobile ? closeMobile : undefined}
          />
        </div>

        <div
          className={cn(
            "mt-auto border-t px-4 py-4",
            isCollapsed && "px-2",
          )}
        >
          {!options.mobile && (
            <Button
              type="button"
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              className={cn(!isCollapsed && "mb-3 w-full justify-start gap-2 whitespace-nowrap")}
              aria-label={
                isCollapsed ? copy.nav.expandSidebar : copy.nav.collapseSidebar
              }
              title={
                isCollapsed ? copy.nav.expandSidebar : copy.nav.collapseSidebar
              }
              onClick={() => setSidebarCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" />
                  {copy.nav.collapseSidebar}
                </>
              )}
            </Button>
          )}

          {!isCollapsed && (
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          )}
          <form action={logoutAction} className={cn(isCollapsed ? "mt-0" : "mt-2")}>
            <Button
              type="submit"
              variant="outline"
              size={isCollapsed ? "icon" : "sm"}
              className={cn(!isCollapsed && "w-full")}
              data-testid="logout-button"
              aria-label={copy.auth.signOut}
              title={isCollapsed ? copy.auth.signOut : undefined}
            >
              {isCollapsed ? (
                <LogOut className="size-4" />
              ) : (
                copy.auth.signOut
              )}
            </Button>
          </form>
        </div>
      </>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col overflow-hidden border-r bg-background md:flex",
          collapsed
            ? "w-14 min-w-14 max-w-14"
            : "w-[14rem] min-w-[14rem] max-w-[14rem]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {sidebarContent({ collapsed })}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <BrandLogo size="sm" />
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            {copy.auth.signOut}
          </Button>
        </form>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{copy.nav.menu}</SheetTitle>
          </SheetHeader>
          {sidebarContent({ mobile: true })}
        </SheetContent>
      </Sheet>
    </>
  );
}
