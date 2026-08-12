"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/gastos-fixos", label: copy.gastosFixos.tabFixed, exact: true },
  {
    href: "/gastos-fixos/orcamento-diario",
    label: copy.gastosFixos.tabDailyBudget,
    exact: false,
  },
] as const;

export function GastosFixosTabs() {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label={copy.gastosFixos.title}
      className="inline-flex rounded-lg border bg-muted/40 p-0.5"
    >
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
