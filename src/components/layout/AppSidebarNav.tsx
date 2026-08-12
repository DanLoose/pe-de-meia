"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderOpen,
  Menu,
  Repeat,
  Table2,
  TrendingUp,
} from "lucide-react";
import { copy } from "@/lib/copy";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: typeof Table2;
  title?: string;
};

const visionLinks: NavLink[] = [
  { href: "/totais", label: copy.nav.totais, icon: BarChart3 },
  { href: "/saldos", label: copy.nav.saldos, icon: Table2 },
  {
    href: "/horizonte",
    label: copy.nav.horizonte,
    title: copy.nav.horizonteHint,
    icon: TrendingUp,
  },
];

const configureLinks: NavLink[] = [
  { href: "/gastos-fixos", label: copy.nav.gastosFixos, icon: Repeat },
  { href: "/tags", label: copy.nav.categories, icon: FolderOpen },
  { href: "/menu", label: copy.nav.menu, icon: Menu },
];

interface AppSidebarNavProps {
  pathname?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

function isActive(activePath: string, href: string) {
  return activePath === href || activePath.startsWith(`${href}/`);
}

function NavSection({
  label,
  links,
  activePath,
  collapsed,
  hydrated,
  onNavigate,
}: {
  label?: string;
  links: NavLink[];
  activePath: string;
  collapsed?: boolean;
  hydrated: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      {label && !collapsed ? (
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      {links.map((link) => {
        const Icon = link.icon;
        const active = isActive(activePath, link.href);
        const title = hydrated
          ? (link.title ?? (collapsed ? link.label : undefined))
          : undefined;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={title}
            suppressHydrationWarning
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
    </div>
  );
}

export function AppSidebarNav({
  pathname: serverPathname,
  collapsed,
  onNavigate,
  className,
}: AppSidebarNavProps) {
  const clientPathname = usePathname();
  const hydrated = useHydrated();
  const activePath = hydrated ? clientPathname : (serverPathname ?? clientPathname);

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      <NavSection
        label={copy.nav.sectionDaily}
        links={visionLinks}
        activePath={activePath}
        collapsed={collapsed}
        hydrated={hydrated}
        onNavigate={onNavigate}
      />
      <NavSection
        label={copy.nav.sectionOrganize}
        links={configureLinks}
        activePath={activePath}
        collapsed={collapsed}
        hydrated={hydrated}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
