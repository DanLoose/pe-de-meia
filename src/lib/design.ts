import { cn } from "@/lib/utils";

/** Tabular numbers for aligned currency display. */
export const moneyClass = "tabular-nums";

export function incomeClass(className?: string) {
  return cn("text-income", moneyClass, className);
}

export function expenseClass(className?: string) {
  return cn("text-expense", moneyClass, className);
}

export function balanceClass(value: number, className?: string) {
  return cn(
    moneyClass,
    value > 0 && "text-income",
    value < 0 && "text-expense",
    className,
  );
}

const DEFAULT_LOW_THRESHOLD = 500;

export function balanceHeatmapClass(
  value: number,
  lowThreshold = DEFAULT_LOW_THRESHOLD,
  className?: string,
) {
  if (value < 0) {
    return cn(moneyClass, "bg-expense/15 text-expense font-medium", className);
  }
  if (value <= lowThreshold) {
    return cn(
      moneyClass,
      "bg-amber-100 text-amber-800 font-medium dark:bg-amber-950/40 dark:text-amber-300",
      className,
    );
  }
  return cn(moneyClass, "text-income", className);
}

export function zeroValueClass(value: number, className?: string) {
  return cn(
    moneyClass,
    value === 0 && "text-muted-foreground/35",
    className,
  );
}

export function ledgerMovementClass(
  value: number,
  variant: "income" | "expense" | "neutral",
  className?: string,
) {
  if (value === 0) {
    return cn(moneyClass, "text-muted-foreground/35", className);
  }

  const colorClass =
    variant === "income"
      ? incomeClass()
      : variant === "expense"
        ? expenseClass()
        : "text-foreground";

  return cn(colorClass, "font-semibold", className);
}

export function ledgerBalanceClass(
  value: number,
  lowThreshold = DEFAULT_LOW_THRESHOLD,
  options?: { muted?: boolean; className?: string },
) {
  const { muted, className } = options ?? {};

  if (muted && value >= 0 && value > lowThreshold) {
    return cn(moneyClass, "text-muted-foreground/65", className);
  }

  return balanceHeatmapClass(value, lowThreshold, className);
}

export function ledgerRowHasActivity(row: {
  income: number;
  expense: number;
  daily: number;
  savings: number;
  card: number;
}): boolean {
  return (
    row.income !== 0 ||
    row.expense !== 0 ||
    row.daily !== 0 ||
    row.savings !== 0 ||
    row.card !== 0
  );
}

export function horizonDayClass(
  balance: number,
  lowThreshold: number,
  options?: {
    isPast?: boolean;
    isProjected?: boolean;
    className?: string;
  },
) {
  const { isPast, isProjected, className } = options ?? {};

  if (isPast && balance >= 0 && balance > lowThreshold) {
    return cn(moneyClass, "bg-muted/30 text-muted-foreground", className);
  }

  const heatmap = balanceHeatmapClass(balance, lowThreshold, className);

  if (isProjected && balance >= 0 && balance > lowThreshold) {
    return cn(heatmap, "border border-dashed border-border/80 bg-background/80", className);
  }

  return heatmap;
}
