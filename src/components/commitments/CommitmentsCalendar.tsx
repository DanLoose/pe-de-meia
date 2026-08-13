"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CommitmentMapDay, CommitmentMapEvent } from "@/lib/commitment-map";
import { copy } from "@/lib/copy";

const DOW_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const DOW_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_BARS = 3;

interface CommitmentsCalendarProps {
  year: number;
  month: number;
  days: CommitmentMapDay[];
  today: string;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}

function dayTone(events: CommitmentMapEvent[]) {
  if (events.length === 0) return "empty" as const;
  const hasIncome = events.some((e) => e.type === "INCOME");
  const hasExpense = events.some((e) => e.type === "EXPENSE");
  if (hasIncome && hasExpense) return "mixed" as const;
  if (hasIncome) return "income" as const;
  return "expense" as const;
}

function EventBars({ events }: { events: CommitmentMapEvent[] }) {
  if (events.length === 0) return null;
  const visible = events.slice(0, MAX_BARS);
  const extra = events.length - visible.length;

  return (
    <div className="mt-auto flex w-full flex-col gap-[3px] pt-1">
      {visible.map((event) => (
        <span
          key={event.id}
          className={cn(
            "h-[5px] w-full rounded-full",
            event.type === "INCOME"
              ? "bg-income shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
              : "bg-expense shadow-[0_0_0_1px_rgba(255,255,255,0.35)]",
          )}
          title={`${event.label} · ${event.type === "INCOME" ? "receita" : "gasto"}`}
        />
      ))}
      {extra > 0 ? (
        <span className="pt-0.5 text-center text-[9px] font-semibold leading-none text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function CommitmentsCalendar({
  year,
  month,
  days,
  today,
  selectedDate,
  onSelectDay,
}: CommitmentsCalendarProps) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startPad = first.getUTCDay();

  const cells: ReactNode[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(
      <div
        key={`pad-${i}`}
        className="min-h-[3.75rem] rounded-2xl bg-muted/20 sm:min-h-[4.5rem]"
        aria-hidden
      />,
    );
  }

  for (const day of days) {
    const isToday = day.date === today;
    const isSelected = day.date === selectedDate;
    const tone = dayTone(day.events);
    const weekday = new Date(Date.UTC(year, month - 1, day.day)).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;

    cells.push(
      <button
        key={day.date}
        type="button"
        onClick={() => onSelectDay(day.date)}
        className={cn(
          "group relative flex min-h-[3.75rem] flex-col rounded-2xl border p-1.5 text-left sm:min-h-[4.5rem] sm:p-2",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          tone === "empty" &&
            "border-border/50 bg-muted/25 hover:border-border hover:bg-background hover:shadow-sm",
          tone === "income" &&
            "border-income/25 bg-income/[0.14] hover:border-income/40 hover:bg-income/[0.2]",
          tone === "expense" &&
            "border-expense/25 bg-expense/[0.14] hover:border-expense/40 hover:bg-expense/[0.2]",
          tone === "mixed" &&
            "border-primary/20 bg-gradient-to-b from-income/[0.16] to-expense/[0.14] hover:from-income/[0.22] hover:to-expense/[0.2]",
          isWeekend && tone === "empty" && "bg-muted/40",
          isSelected &&
            "z-[1] border-primary/50 bg-background shadow-[0_8px_24px_-12px_rgba(15,40,35,0.45)] ring-2 ring-primary/25",
          isToday && !isSelected && "ring-1 ring-primary/40",
        )}
        aria-label={`${copy.ledger.day} ${day.day}`}
        aria-pressed={isSelected}
      >
        <span className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors sm:size-7 sm:text-[13px]",
              isToday
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground group-hover:text-foreground",
              isSelected && !isToday && "bg-foreground text-background",
              tone !== "empty" && !isToday && !isSelected && "text-foreground",
            )}
          >
            {day.day}
          </span>
          {day.events.length > 1 ? (
            <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
              {day.events.length}
            </span>
          ) : null}
        </span>
        <EventBars events={day.events} />
        {day.events.length === 1 ? (
          <span className="mt-1 hidden truncate text-[9px] font-medium leading-tight text-foreground/55 sm:block">
            {day.events[0]!.label}
          </span>
        ) : null}
      </button>,
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DOW_SHORT.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">{DOW_FULL[i]}</span>
          </div>
        ))}
        {cells}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-income" />
          {copy.commitmentsMap.legendIncome}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-4 rounded-full bg-expense" />
          {copy.commitmentsMap.legendExpense}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          {copy.calendar.today}
        </span>
      </div>
    </div>
  );
}
