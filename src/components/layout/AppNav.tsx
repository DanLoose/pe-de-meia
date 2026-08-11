"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderOpen, Repeat } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const links = [
  { href: "/calendar", label: copy.nav.calendar, icon: CalendarDays },
  { href: "/categories", label: copy.nav.categories, icon: FolderOpen },
  { href: "/recurring", label: copy.nav.recurring, icon: Repeat },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {links.map((link) => {
        const Icon = link.icon;
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{link.label}</span>
            <span className="sm:hidden">{link.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
