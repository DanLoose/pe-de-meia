import { copy } from "@/lib/copy";
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
        className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm sm:gap-4 sm:p-4"
      >
        <div>
          <p className="text-muted-foreground">{copy.period.income}</p>
          <p className="text-lg font-semibold text-emerald-600">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{copy.period.expense}</p>
          <p className="text-lg font-semibold text-red-600">
            {formatCurrency(totals.expense)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{copy.period.net}</p>
          <p
            className={cn(
              "text-lg font-semibold",
              net > 0 && "text-emerald-600",
              net < 0 && "text-red-600",
            )}
          >
            {formatCurrency(net)}
          </p>
        </div>
      </div>

      {budgetSummary && budgetSummary.budgetTotal > 0 && (
        <div
          data-testid="budget-summary-bar"
          className="rounded-xl border bg-card p-3 text-sm shadow-sm sm:p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground">{copy.period.budget}</p>
              <p className="font-semibold">
                {formatCurrency(budgetSummary.expenseTotal)} /{" "}
                {formatCurrency(budgetSummary.budgetTotal)}
              </p>
            </div>
            {budgetPercent !== null && (
              <p
                className={
                  budgetPercent > 100 ? "font-medium text-red-600" : "text-muted-foreground"
                }
              >
                {budgetPercent}% {copy.period.budgetUsed}
              </p>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent !== null && budgetPercent > 100
                  ? "bg-red-500"
                  : "bg-primary"
              }`}
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
