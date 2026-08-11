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
