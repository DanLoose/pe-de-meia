"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { balanceHeatmapClass } from "@/lib/design";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HorizonData, HorizonDayCell } from "@/types";

interface HorizonGridProps {
  data: HorizonData;
  onSelectDay?: (cell: HorizonDayCell) => void;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthColumnLabel(year: number, month: number): string {
  const short = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
  return `${short}/${String(year).slice(-2)}`;
}

function cashFlowFlags(cell: HorizonDayCell) {
  let hasIn = false;
  let hasOut = false;
  for (const movement of cell.movements) {
    if (movement.cashDelta > 0) hasIn = true;
    if (movement.cashDelta < 0) hasOut = true;
  }
  if (!hasIn && !hasOut && cell.delta !== 0) {
    if (cell.delta > 0) hasIn = true;
    if (cell.delta < 0) hasOut = true;
  }
  return { hasIn, hasOut };
}

export function HorizonGrid({ data, onSelectDay }: HorizonGridProps) {
  const [todayYear, todayMonth, todayDay] = data.today.split("-").map(Number);

  const cellByDate = new Map<string, HorizonDayCell>();
  for (const month of data.months) {
    for (const cell of month.days) {
      cellByDate.set(cell.date, cell);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="sticky left-0 z-20 min-w-[2.5rem] border-r border-border/50 bg-muted/80 px-2 py-2.5 text-left font-medium backdrop-blur-sm">
                {/* day column */}
              </th>
              {data.months.map((month) => {
                const isCurrentMonth =
                  month.year === todayYear && month.month === todayMonth;

                return (
                  <th
                    key={`${month.year}-${month.month}`}
                    id={`horizon-month-${month.year}-${month.month}`}
                    className={cn(
                      "min-w-[4.75rem] border-l border-border/40 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide",
                      isCurrentMonth
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {monthColumnLabel(month.year, month.month)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, index) => {
              const dayNum = index + 1;
              const isTodayRow = dayNum === todayDay;

              return (
                <tr
                  key={dayNum}
                  id={isTodayRow ? `horizon-day-${dayNum}` : undefined}
                  className="border-b border-border/30 last:border-b-0"
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-r border-border/50 px-2 py-1 text-center font-medium tabular-nums backdrop-blur-sm",
                      isTodayRow
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/90 text-muted-foreground",
                    )}
                  >
                    {dayNum}
                  </td>
                  {data.months.map((month) => {
                    const monthDays = daysInMonth(month.year, month.month);

                    if (dayNum > monthDays) {
                      return (
                        <td
                          key={`${month.year}-${month.month}-${dayNum}`}
                          className="border-l border-border/30 bg-muted/10 px-1.5 py-1 text-center text-muted-foreground/25"
                        >
                          —
                        </td>
                      );
                    }

                    const dateStr = `${month.year}-${String(month.month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                    const cell = cellByDate.get(dateStr);

                    if (!cell) {
                      return (
                        <td
                          key={`${month.year}-${month.month}-${dayNum}`}
                          className="border-l border-border/30 bg-muted/10 px-1.5 py-1 text-center text-muted-foreground/25"
                          title={dateStr}
                        >
                          —
                        </td>
                      );
                    }

                    const isTodayCell =
                      cell.isToday &&
                      month.year === todayYear &&
                      month.month === todayMonth;
                    const { hasIn, hasOut } = cashFlowFlags(cell);

                    return (
                      <td
                        key={cell.date}
                        data-testid={`horizon-cell-${cell.date}`}
                        className="border-l border-border/30 p-0"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectDay?.(cell)}
                          title={`${dateStr} · ${formatCurrency(cell.balance)}`}
                          className={cn(
                            "relative flex min-h-8 w-full items-center justify-end gap-0.5 px-1.5 py-1 text-right tabular-nums transition-colors",
                            "hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            balanceHeatmapClass(
                              cell.balance,
                              data.lowThreshold,
                            ),
                            isTodayCell &&
                              "ring-1 ring-inset ring-primary/50",
                            cell.hasRecurring && "font-semibold",
                          )}
                        >
                          {(hasIn || hasOut) && (
                            <span
                              className="absolute left-0.5 top-0.5 flex flex-col leading-none"
                              aria-hidden
                            >
                              {hasIn ? (
                                <ArrowUp
                                  className="size-2.5 text-income"
                                  strokeWidth={2.5}
                                />
                              ) : null}
                              {hasOut ? (
                                <ArrowDown
                                  className="size-2.5 text-expense"
                                  strokeWidth={2.5}
                                />
                              ) : null}
                            </span>
                          )}
                          <span className={cn((hasIn || hasOut) && "pl-2.5")}>
                            {formatCompactCurrency(cell.balance)}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
