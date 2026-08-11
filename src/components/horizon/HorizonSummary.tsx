import {
  KpiCard,
  balanceClass,
  expenseClass,
  incomeClass,
} from "@/components/totals/KpiCard";
import { copy } from "@/lib/copy";
import { formatCurrency, formatShortDateLabel } from "@/lib/format";
import type { HorizonSummary } from "@/types";

interface HorizonSummaryProps {
  summary: HorizonSummary;
}

export function HorizonSummaryCards({ summary }: HorizonSummaryProps) {
  const firstNegativeStatus = summary.firstNegativeDate
    ? formatShortDateLabel(summary.firstNegativeDate)
    : copy.horizon.noNegativeDays;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title={copy.horizon.summaryToday}
        value={formatCurrency(summary.currentBalance)}
        status={copy.horizon.actualDay}
        valueClassName={balanceClass(summary.currentBalance)}
      />
      <KpiCard
        title={copy.horizon.summaryEnd}
        value={formatCurrency(summary.endBalance)}
        status={copy.horizon.projectedDay}
        valueClassName={balanceClass(summary.endBalance)}
      />
      <KpiCard
        title={copy.horizon.summaryLowest}
        value={formatCurrency(summary.lowestBalance)}
        status={formatShortDateLabel(summary.lowestDate)}
        valueClassName={balanceClass(summary.lowestBalance)}
      />
      <KpiCard
        title={copy.horizon.summaryFirstNegative}
        value={
          summary.firstNegativeBalance !== null
            ? formatCurrency(summary.firstNegativeBalance)
            : "—"
        }
        status={firstNegativeStatus}
        valueClassName={
          summary.firstNegativeDate ? expenseClass() : incomeClass()
        }
      />
    </div>
  );
}
