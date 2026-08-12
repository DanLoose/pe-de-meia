"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  KpiCard,
  balanceClass,
  expenseClass,
  incomeClass,
} from "@/components/totals/KpiCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
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

  const navigateMonth = (delta: number) => {
    const next = shiftMonth(data.year, data.month, delta);
    startTransition(() => {
      router.push(`/totais?year=${next.year}&month=${next.month}`);
    });
  };

  const dailyValue =
    data.dailyCeiling !== null
      ? `${formatCurrency(data.dailyAverage)} / ${formatCurrency(data.dailyCeiling)}`
      : formatCurrency(data.dailyAverage);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={copy.ledger.prevMonth}
            onClick={() => navigateMonth(-1)}
            disabled={isPending}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
            {monthLabel(data.year, data.month)}
          </h2>
          <Button
            variant="outline"
            size="icon"
            aria-label={copy.ledger.nextMonth}
            onClick={() => navigateMonth(1)}
            disabled={isPending}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={copy.totals.performance}
          value={formatCurrency(data.performance)}
          status={data.performanceStatus}
          valueClassName={balanceClass(data.performance)}
        />
        <KpiCard
          title={copy.totals.saved}
          value={formatCurrency(data.saved)}
          status={data.savedStatus}
          progress={data.savedPercent}
          valueClassName={incomeClass()}
        />
        <KpiCard
          title={copy.totals.costOfLiving}
          value={formatCurrency(data.costOfLiving)}
          status={data.costOfLivingStatus}
          valueClassName={expenseClass()}
        />
        <KpiCard
          title={copy.totals.dailyAverage}
          value={dailyValue}
          status={data.dailyStatus}
          valueClassName={expenseClass()}
          statusAction={
            data.dailyCeiling === null
              ? {
                  href: "/gastos-fixos/orcamento-diario",
                  label: copy.totals.configureDailyCeiling,
                }
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.totals.movements}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{copy.totals.totalIncome}</p>
            <p className={`text-xl font-semibold ${incomeClass()}`}>
              {formatCurrency(data.totalIncome)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{copy.totals.totalExpense}</p>
            <p className={`text-xl font-semibold ${expenseClass()}`}>
              {formatCurrency(data.totalExpense)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
