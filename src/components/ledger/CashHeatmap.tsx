import type { ReactNode } from "react";
import { copy } from "@/lib/copy";
import { balanceBand } from "@/lib/balance-insights";
import { cn } from "@/lib/utils";
import type { LedgerDayRow } from "@/types";

const DOW = ["D", "S", "T", "Q", "Q", "S", "S"];

interface CashHeatmapProps {
  year: number;
  month: number;
  rows: LedgerDayRow[];
  today: string;
  onSelectDay?: (date: string) => void;
}

export function CashHeatmap({
  year,
  month,
  rows,
  today,
  onSelectDay,
}: CashHeatmapProps) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startPad = first.getUTCDay();

  const cells: ReactNode[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(<div key={`pad-${i}`} className="aspect-square" />);
  }
  for (const row of rows) {
    const band = balanceBand(row.balance);
    const isToday = row.date === today;
    cells.push(
      <button
        key={row.date}
        type="button"
        onClick={() => onSelectDay?.(row.date)}
        className={cn(
          "flex aspect-square flex-col items-center justify-center rounded-md text-[11px] tabular-nums transition-opacity hover:opacity-90",
          band === "ok" && "bg-income/25 text-foreground",
          band === "low" &&
            "bg-amber-200/80 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100",
          band === "bad" && "bg-expense/35 font-semibold text-expense",
          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        )}
        aria-label={`${copy.ledger.day} ${row.day}`}
      >
        <span>{row.day}</span>
      </button>,
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-income/40" />
          {copy.ledger.heatmapLegendOk}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-300" />
          {copy.ledger.heatmapLegendLow}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-expense/50" />
          {copy.ledger.heatmapLegendBad}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="py-0.5 text-center text-[10px] font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells}
      </div>
      <p className="text-xs text-muted-foreground">{copy.ledger.heatmapHint}</p>
    </div>
  );
}

export function RedStreakBanner({
  streak,
}: {
  streak: { startDay: number; endDay: number; days: number } | null;
}) {
  if (!streak) {
    return (
      <p className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {copy.ledger.streakNone}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-3 text-sm">
      <p className="font-semibold text-expense">
        {copy.ledger.streakTitle(streak.startDay, streak.endDay, streak.days)}
      </p>
      <p className="mt-1 text-muted-foreground">
        {copy.ledger.streakBody(streak.days)}
      </p>
    </div>
  );
}
