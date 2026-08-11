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
    value === 0 && "text-muted-foreground/50",
    className,
  );
}
