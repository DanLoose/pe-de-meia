import { balanceClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TotalsVerdict } from "@/types";

interface FolgaHeroProps {
  folga: number;
  verdict: TotalsVerdict;
  monthKey: string;
  /** When verdict is empty and user already has costs, prompt for income. */
  missingIncome?: boolean;
}

function verdictLabel(verdict: TotalsVerdict, missingIncome: boolean): string {
  switch (verdict) {
    case "surplus":
      return copy.totals.verdictSurplus;
    case "tight":
      return copy.totals.verdictTight;
    case "deficit":
      return copy.totals.verdictDeficit;
    case "empty":
      return missingIncome
        ? copy.totals.verdictMissingIncome
        : copy.totals.verdictEmpty;
  }
}

function verdictClass(verdict: TotalsVerdict): string {
  switch (verdict) {
    case "surplus":
      return "text-income";
    case "tight":
      return "text-foreground";
    case "deficit":
      return "text-expense";
    case "empty":
      return "text-muted-foreground";
  }
}

export function FolgaHero({
  folga,
  verdict,
  monthKey,
  missingIncome = false,
}: FolgaHeroProps) {
  return (
    <div key={monthKey} className="animate-in fade-in duration-300">
      <p className="text-sm font-medium text-muted-foreground">
        {copy.totals.slack}
      </p>
      <p
        className={cn(
          "mt-1 text-4xl font-semibold tracking-tight sm:text-5xl",
          moneyClass,
          balanceClass(folga),
        )}
      >
        {formatCurrency(folga)}
      </p>
      <p
        className={cn(
          "mt-2 text-base font-medium sm:text-lg",
          verdictClass(verdict),
        )}
      >
        {verdictLabel(verdict, missingIncome)}
      </p>
    </div>
  );
}
