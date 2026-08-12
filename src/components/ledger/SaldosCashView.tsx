"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CashHeatmap,
  RedStreakBanner,
} from "@/components/ledger/CashHeatmap";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import {
  balanceOnDate,
  longestNegativeStreak,
} from "@/lib/balance-insights";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { moneyClass, balanceClass } from "@/lib/design";
import { cn } from "@/lib/utils";
import type { CategoryDTO, LedgerMonthData } from "@/types";

interface SaldosCashViewProps {
  initialData: LedgerMonthData;
  categories: CategoryDTO[];
  today: string;
}

export function SaldosCashView({
  initialData,
  categories,
  today,
}: SaldosCashViewProps) {
  const [data, setData] = useState(initialData);
  const streak = useMemo(
    () => longestNegativeStreak(data.rows),
    [data.rows],
  );
  const todayBalance = balanceOnDate(data.rows, today);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {todayBalance !== null ? (
          <div>
            <p className="text-sm text-muted-foreground">
              {copy.ledger.todayBalance}
            </p>
            <p
              className={cn(
                "text-3xl font-semibold tracking-tight",
                moneyClass,
                balanceClass(todayBalance),
              )}
            >
              {formatCurrency(todayBalance)}
            </p>
          </div>
        ) : null}

        <RedStreakBanner streak={streak} />

        <div className="rounded-xl border border-border/80 bg-card p-3 sm:p-4">
          <CashHeatmap
            year={data.year}
            month={data.month}
            rows={data.rows}
            today={today}
            onSelectDay={(date) => {
              window.location.hash = `day-${date}`;
              document
                .getElementById(`day-${date}`)
                ?.scrollIntoView({ block: "center", behavior: "smooth" });
            }}
          />
        </div>

        <Link
          href="/totais"
          className="inline-block text-sm font-medium text-primary hover:underline"
        >
          {copy.ledger.seePlan}
        </Link>
      </div>

      <div className="min-h-[320px]">
        <LedgerTable
          key={`${data.year}-${data.month}`}
          initialData={data}
          categories={categories}
          today={today}
          onDataChange={setData}
        />
      </div>
    </div>
  );
}
