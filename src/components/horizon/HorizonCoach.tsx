import Link from "next/link";
import { copy } from "@/lib/copy";
import { formatCurrency, formatShortDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HorizonSummary } from "@/types";

interface HorizonCoachProps {
  summary: HorizonSummary;
}

export function HorizonCoach({ summary }: HorizonCoachProps) {
  const hasNegative = summary.firstNegativeDate !== null;

  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5",
        hasNegative
          ? "bg-gradient-to-br from-expense/10 via-background/80 to-background/80"
          : "bg-gradient-to-br from-income/10 via-background/80 to-background/80",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        {hasNegative ? copy.horizon.coachTitle : copy.horizon.coachOkTitle}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/90">
        {hasNegative && summary.firstNegativeDate
          ? copy.horizon.coachNegativeBody(
              formatShortDateLabel(summary.firstNegativeDate),
              formatCurrency(summary.lowestBalance),
              formatShortDateLabel(summary.lowestDate),
            )
          : copy.horizon.coachOkBody}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href="/gastos-fixos"
          className="text-sm font-medium text-primary hover:underline"
        >
          {copy.horizon.coachCta}
        </Link>
        <span className="text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <Link
          href="/extrato"
          className="text-sm font-medium text-primary hover:underline"
        >
          {copy.extrato.seeExtrato}
        </Link>
      </div>
    </div>
  );
}
