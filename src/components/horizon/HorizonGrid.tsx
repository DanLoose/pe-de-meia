"use client";

import { balanceHeatmapClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HorizonData } from "@/types";

interface HorizonGridProps {
  data: HorizonData;
}

export function HorizonGrid({ data }: HorizonGridProps) {
  const maxDays = Math.max(...data.months.map((m) => m.days.length), 1);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[720px] border-collapse text-xs">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 px-2 py-2 text-left font-medium">
              Dia
            </th>
            {data.months.map((month) => (
              <th
                key={`${month.year}-${month.month}`}
                colSpan={month.days.length}
                className="border-l px-2 py-2 text-center font-medium capitalize"
              >
                {month.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxDays }, (_, index) => {
            const dayNum = index + 1;
            return (
              <tr key={dayNum} className="border-b">
                <td className="sticky left-0 z-10 bg-card px-2 py-1 font-medium tabular-nums">
                  {String(dayNum).padStart(2, "0")}
                </td>
                {data.months.map((month) => {
                  const cell = month.days.find(
                    (d) => Number(d.date.split("-")[2]) === dayNum,
                  );
                  if (!cell) {
                    return (
                      <td
                        key={`${month.year}-${month.month}-${dayNum}`}
                        className="border-l px-1 py-1 text-muted-foreground/30"
                      >
                        —
                      </td>
                    );
                  }
                  return (
                    <td
                      key={cell.date}
                      data-testid={`horizon-cell-${cell.date}`}
                      className={cn(
                        "border-l px-1 py-1 text-right tabular-nums",
                        balanceHeatmapClass(cell.balance, data.lowThreshold),
                      )}
                      title={cell.date}
                    >
                      {formatCurrency(cell.balance)}
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
