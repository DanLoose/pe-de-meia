import { copy } from "@/lib/copy";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BudgetSummary, DailySummary } from "@/types";

interface PeriodSummaryBarProps {
  summaries: DailySummary[];
  budgetSummary?: BudgetSummary | null;
}

export function PeriodSummaryBar({
  summaries,
  budgetSummary,
}: PeriodSummaryBarProps) {
  const totals = summaries.reduce(
    (acc, summary) => {
      acc.income += summary.incomeTotal;
      acc.expense += summary.expenseTotal;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  const net = totals.income - totals.expense;
  const budgetPercent =
    budgetSummary && budgetSummary.budgetTotal > 0
      ? Math.round((budgetSummary.expenseTotal / budgetSummary.budgetTotal) * 100)
      : null;

  return (
    <div className="space-y-3">
      <div
        data-testid="period-summary-bar"
        className="rounded-xl border bg-card p-4 shadow-sm"
      >
        <div className="grid grid-cols-3 gap-4 border-b pb-4 text-sm">
          <div>
            <p className="text-muted-foreground">{copy.period.income}</p>
            <p className={cn("text-base font-semibold", incomeClass())}>
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{copy.period.expense}</p>
            <p className={cn("text-base font-semibold", expenseClass())}>
              {formatCurrency(totals.expense)}
            </p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-muted-foreground">{copy.period.net}</p>
            <p className={cn("text-2xl font-bold", balanceClass(net))}>
              {formatCurrency(net)}
            </p>
          </div>
        </div>
      </div>

      {budgetSummary && budgetSummary.budgetTotal > 0 && (
        <div
          data-testid="budget-summary-bar"
          className="rounded-xl border bg-card p-4 text-sm shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground">{copy.period.budget}</p>
              <p className={cn("font-semibold", moneyClass)}>
                {formatCurrency(budgetSummary.expenseTotal)} /{" "}
                {formatCurrency(budgetSummary.budgetTotal)}
              </p>
            </div>
            {budgetPercent !== null && (
              <p
                className={cn(
                  budgetPercent > 100 ? cn("font-medium", expenseClass()) : "text-muted-foreground",
                )}
              >
                {budgetPercent}% {copy.period.budgetUsed}
              </p>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budgetPercent !== null && budgetPercent > 100 ? "bg-expense" : "bg-primary",
              )}
              style={{
                width: `${Math.min(budgetPercent ?? 0, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
