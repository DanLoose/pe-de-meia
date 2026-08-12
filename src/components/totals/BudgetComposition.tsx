"use client";

import { useEffect, useState } from "react";
import { expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BudgetCompositionProps {
  fixedIncome: number;
  fixedExpense: number;
  variableEstimate: number | null;
  costOfLiving: number;
  monthKey: string;
}

function CompositionBar({
  value,
  max,
  fillClassName,
}: {
  value: number;
  max: number;
  fillClassName: string;
}) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[400ms] ease-out",
          fillClassName,
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function BudgetComposition({
  fixedIncome,
  fixedExpense,
  variableEstimate,
  costOfLiving,
  monthKey,
}: BudgetCompositionProps) {
  const variablePart = variableEstimate ?? 0;
  const scale = Math.max(fixedIncome, costOfLiving, 1);

  return (
    <div
      key={monthKey}
      className="space-y-5 border-t border-border/60 pt-6"
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {copy.totals.fixedIncome}
          </p>
          <p className={cn("text-lg font-semibold", incomeClass())}>
            {formatCurrency(fixedIncome)}
          </p>
        </div>
        <CompositionBar
          value={fixedIncome}
          max={scale}
          fillClassName="bg-income"
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              {copy.totals.costOfLiving}
            </p>
            <p className={cn("text-lg font-semibold", expenseClass())}>
              {formatCurrency(costOfLiving)}
            </p>
          </div>
          <CompositionBar
            value={costOfLiving}
            max={scale}
            fillClassName="bg-expense"
          />
        </div>

        <div className="space-y-2 pl-1 sm:pl-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="text-muted-foreground">{copy.totals.fixedExpenses}</p>
            <p className={cn("font-medium", moneyClass)}>
              {formatCurrency(fixedExpense)}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              {copy.totals.variableEstimate}
            </p>
            <p className={cn("font-medium", moneyClass)}>
              {formatCurrency(variablePart)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
