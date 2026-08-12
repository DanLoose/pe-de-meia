import { expenseClass, incomeClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";

interface LedgerMovementsProps {
  totalIncome: number;
  totalExpense: number;
}

export function LedgerMovements({
  totalIncome,
  totalExpense,
}: LedgerMovementsProps) {
  return (
    <div className="border-t border-border/60 pt-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        {copy.totals.movements}
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {copy.totals.totalIncome}
          </p>
          <p className={`text-xl font-semibold ${incomeClass()}`}>
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {copy.totals.totalExpense}
          </p>
          <p className={`text-xl font-semibold ${expenseClass()}`}>
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>
    </div>
  );
}
