"use client";

import Link from "next/link";
import { BudgetComposition } from "@/components/totals/BudgetComposition";
import { FolgaHero } from "@/components/totals/FolgaHero";
import { LedgerMovements } from "@/components/totals/LedgerMovements";
import { LifestyleCoach } from "@/components/totals/LifestyleCoach";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { incomeClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthTotalsData } from "@/types";

interface TotalsDashboardProps {
  data: MonthTotalsData;
  today: string;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function TotalsDashboard({ data, today }: TotalsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const monthKey = `${data.year}-${data.month}`;
  const missingIncome =
    data.verdict === "empty" &&
    (data.fixedExpense > 0 || data.variableEstimate !== null);

  const navigateMonth = (delta: number) => {
    const next = shiftMonth(data.year, data.month, delta);
    startTransition(() => {
      router.push(`/totais?year=${next.year}&month=${next.month}`);
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={copy.ledger.prevMonth}
            onClick={() => navigateMonth(-1)}
            disabled={isPending}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="min-w-[140px] text-center text-sm capitalize text-muted-foreground">
            {monthLabel(data.year, data.month)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={copy.ledger.nextMonth}
            onClick={() => navigateMonth(1)}
            disabled={isPending}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => {
            const [y, m] = today.split("-").map(Number);
            startTransition(() => {
              router.push(`/totais?year=${y}&month=${m}`);
            });
          }}
          disabled={isPending}
        >
          {copy.calendar.today}
        </Button>
      </div>

      <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-muted/80 px-3 py-1 text-xs text-muted-foreground">
        <span>
          {copy.totals.planChip.split("·")[0]?.trim()}
          {" · "}
          <span className="font-medium text-foreground">
            {copy.totals.planChip.split("·")[1]?.trim()}
          </span>
        </span>
        <Link href="/saldos" className="font-medium text-primary hover:underline">
          {copy.totals.seeCash}
        </Link>
      </p>

      <FolgaHero
        folga={data.performance}
        verdict={data.verdict}
        monthKey={monthKey}
        missingIncome={missingIncome}
      />

      <LifestyleCoach
        verdict={data.verdict}
        folga={data.performance}
        missingIncome={missingIncome}
      />

      <BudgetComposition
        fixedIncome={data.fixedIncome}
        fixedExpense={data.fixedExpense}
        variableEstimate={data.variableEstimate}
        costOfLiving={data.costOfLiving}
        monthKey={monthKey}
      />

      {!data.setupComplete ? (
        <div className="border-t border-border/60 pt-6">
          <Link
            href="/gastos-fixos"
            className="text-sm font-medium text-primary hover:underline"
          >
            {copy.totals.setupCta}
          </Link>
        </div>
      ) : null}

      {data.saved > 0 ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-6">
          <p className="text-sm font-medium text-muted-foreground">
            {copy.totals.saved}
          </p>
          <div className="text-right">
            <p className={cn("text-lg font-semibold", incomeClass())}>
              {formatCurrency(data.saved)}
            </p>
            <p className={cn("text-xs text-muted-foreground", moneyClass)}>
              {data.savedStatus}
            </p>
          </div>
        </div>
      ) : null}

      <LedgerMovements
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
      />
    </div>
  );
}
