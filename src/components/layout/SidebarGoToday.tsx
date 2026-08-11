"use client";

import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface SidebarGoTodayProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarGoToday({ collapsed, onNavigate }: SidebarGoTodayProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const href = `/saldos?year=${year}&month=${month}#day-${format(now, "yyyy-MM-dd")}`;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? copy.nav.goToday : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      <CalendarCheck className="size-4 shrink-0" />
      {!collapsed && <span>{copy.nav.goToday}</span>}
    </Link>
  );
}
