"use client";

import { Pencil } from "lucide-react";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency, formatShortDateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HorizonSummary } from "@/types";

interface HorizonSummaryProps {
  summary: HorizonSummary;
  onEditAvailableBalance?: () => void;
}

export function HorizonSummaryCards({
  summary,
  onEditAvailableBalance,
}: HorizonSummaryProps) {
  const firstNegativeStatus = summary.firstNegativeDate
    ? formatShortDateLabel(summary.firstNegativeDate)
    : copy.horizon.noNegativeDays;

  const cards = [
    {
      id: "today" as const,
      label: copy.horizon.summaryToday,
      value: formatCurrency(summary.currentBalance),
      hint: onEditAvailableBalance
        ? copy.horizon.summaryTodayHint
        : copy.horizon.actualDay,
      valueClass: balanceClass(summary.currentBalance),
      tone: summary.currentBalance >= 0 ? "ok" : "bad",
      editable: Boolean(onEditAvailableBalance),
    },
    {
      id: "income" as const,
      label: copy.horizon.summaryIncome,
      value: formatCurrency(summary.totalIncome),
      hint: copy.horizon.summaryIncomeHint,
      valueClass: incomeClass(),
      tone: "ok" as const,
      editable: false,
    },
    {
      id: "expense" as const,
      label: copy.horizon.summaryExpense,
      value: formatCurrency(summary.totalExpense),
      hint: copy.horizon.summaryExpenseHint,
      valueClass: expenseClass(),
      tone: "bad" as const,
      editable: false,
    },
    {
      id: "negative" as const,
      label: copy.horizon.summaryFirstNegative,
      value:
        summary.firstNegativeBalance !== null
          ? formatCurrency(summary.firstNegativeBalance)
          : "—",
      hint: firstNegativeStatus,
      valueClass: summary.firstNegativeDate
        ? expenseClass()
        : incomeClass(),
      tone: summary.firstNegativeDate ? "bad" : "ok",
      editable: false,
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const className = cn(
          "rounded-3xl border border-border/60 bg-background/80 px-4 py-3.5 text-left shadow-sm backdrop-blur-sm",
          "transition-transform duration-300 hover:-translate-y-0.5",
          card.tone === "ok" &&
            "bg-gradient-to-br from-income/10 to-background/80",
          card.tone === "bad" &&
            "bg-gradient-to-br from-expense/10 to-background/80",
          card.editable &&
            "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        );

        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
              </p>
              {card.editable ? (
                <Pencil
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tracking-tight",
                moneyClass,
                card.valueClass,
              )}
            >
              {card.value}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {card.hint}
            </p>
          </>
        );

        if (card.editable && onEditAvailableBalance) {
          return (
            <button
              key={card.id}
              type="button"
              className={className}
              onClick={onEditAvailableBalance}
              aria-label={copy.horizon.summaryTodayEdit}
            >
              {body}
            </button>
          );
        }

        return (
          <div key={card.id} className={className}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
