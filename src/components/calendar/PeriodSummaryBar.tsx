import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import type { DailySummary } from "@/types";

interface PeriodSummaryBarProps {
  summaries: DailySummary[];
}

export function PeriodSummaryBar({ summaries }: PeriodSummaryBarProps) {
  const totals = summaries.reduce(
    (acc, summary) => {
      acc.income += summary.incomeTotal;
      acc.expense += summary.expenseTotal;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  const net = totals.income - totals.expense;

  return (
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
        <p className="text-lg font-semibold">{formatCurrency(net)}</p>
      </div>
    </div>
  );
}
