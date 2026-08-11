"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  Menu,
  Repeat,
  Table2,
  TrendingUp,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const links = [
  { href: "/saldos", label: copy.nav.saldos, icon: Table2 },
  { href: "/totais", label: copy.nav.totais, icon: BarChart3 },
  { href: "/horizonte", label: copy.nav.horizonte, icon: TrendingUp },
  { href: "/calendario", label: copy.nav.calendar, icon: CalendarDays },
  { href: "/tags", label: copy.nav.categories, icon: FolderOpen },
  { href: "/recorrentes", label: copy.nav.recurring, icon: Repeat },
  { href: "/menu", label: copy.nav.menu, icon: Menu },
];

interface AppSidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebarNav({
  collapsed,
  onNavigate,
  className,
}: AppSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
