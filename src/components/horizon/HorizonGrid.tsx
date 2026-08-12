"use client";

import { balanceHeatmapClass } from "@/lib/design";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HorizonData, HorizonDayCell } from "@/types";

interface HorizonGridProps {
  data: HorizonData;
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

export function HorizonGrid({ data }: HorizonGridProps) {
  const [todayYear, todayMonth, todayDay] = data.today.split("-").map(Number);

  const cellByDate = new Map<string, HorizonDayCell>();
  for (const month of data.months) {
    for (const cell of month.days) {
      cellByDate.set(cell.date, cell);
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-max border-collapse text-xs">
        <thead>
          <tr className="border-b">
            <th className="sticky left-0 z-20 min-w-[2.5rem] border-r bg-muted/80 px-2 py-2 text-left font-medium">
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
                    "min-w-[4.25rem] border-l px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide",
                    isCurrentMonth
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground",
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
                className="border-b last:border-b-0"
              >
                <td
                  className={cn(
                    "sticky left-0 z-10 border-r px-2 py-1 text-center font-medium tabular-nums",
                    isTodayRow
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground",
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
                        className="border-l bg-muted/10 px-1.5 py-1 text-center text-muted-foreground/25"
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
                        className="border-l bg-muted/10 px-1.5 py-1 text-center text-muted-foreground/25"
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

                  return (
                    <td
                      key={cell.date}
                      data-testid={`horizon-cell-${cell.date}`}
                      title={`${dateStr} · ${formatCurrency(cell.balance)}`}
                      className={cn(
                        "border-l px-1.5 py-1 text-right tabular-nums",
                        balanceHeatmapClass(cell.balance, data.lowThreshold),
                        isTodayCell && "ring-1 ring-inset ring-foreground/40",
                        cell.hasRecurring && "font-semibold",
                      )}
                    >
                      {formatCompactCurrency(cell.balance)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
