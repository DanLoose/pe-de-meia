"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DailyForecastManager } from "@/components/forecast/DailyForecastManager";
import { RecurringManager } from "@/components/recurring/RecurringManager";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  DailyForecastData,
  RecurringTransactionDTO,
} from "@/types";

type CompromissosTab = "fixos" | "variaveis";

interface CompromissosStudioProps {
  initialRecurrings: RecurringTransactionDTO[];
  categories: CategoryDTO[];
  initialForecast: DailyForecastData;
  initialTab?: CompromissosTab;
}

export function CompromissosStudio({
  initialRecurrings,
  categories,
  initialForecast,
  initialTab = "fixos",
}: CompromissosStudioProps) {
  const [tab, setTab] = useState<CompromissosTab>(initialTab);
  const [recurrings, setRecurrings] = useState(initialRecurrings);
  const [variableTotal, setVariableTotal] = useState(initialForecast.totalFixed);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const item of recurrings) {
      if (!item.active) continue;
      if (item.type === "INCOME") income += item.amount;
      else expense += item.amount;
    }
    const costOfLiving = expense + variableTotal;
    return {
      income,
      expense,
      variable: variableTotal,
      folga: income - costOfLiving,
    };
  }, [recurrings, variableTotal]);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/50",
        "bg-gradient-to-br from-primary/[0.07] via-background to-income/[0.06]",
        "shadow-[0_20px_50px_-28px_rgba(15,40,35,0.35)]",
        "animate-in fade-in duration-500",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-expense/10 blur-3xl"
      />

      <div className="relative space-y-6 p-4 sm:p-6 lg:p-7">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {copy.compromissosStudio.eyebrow}
            </p>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {copy.compromissosStudio.headline}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {copy.compromissosStudio.subtitle}
            </p>
          </div>
          <Link
            href="/mapa-financeiro"
            className="text-sm font-medium text-primary hover:underline"
          >
            {copy.compromissosStudio.seeMap}
          </Link>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryChip
            label={copy.compromissosStudio.kpiIncome}
            value={summary.income}
            tone="income"
          />
          <SummaryChip
            label={copy.compromissosStudio.kpiFixed}
            value={summary.expense}
            tone="expense"
          />
          <SummaryChip
            label={copy.compromissosStudio.kpiVariable}
            value={summary.variable}
            tone="neutral"
          />
          <SummaryChip
            label={copy.compromissosStudio.kpiFolga}
            value={summary.folga}
            tone="folga"
            emphasize
          />
        </div>

        <div
          role="tablist"
          aria-label={copy.gastosFixos.title}
          className="inline-flex rounded-2xl border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur-sm"
        >
          {(
            [
              { id: "fixos", label: copy.gastosFixos.tabFixed },
              { id: "variaveis", label: copy.gastosFixos.tabDailyBudget },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-border/50 bg-background/60 p-3 shadow-sm backdrop-blur-sm sm:p-5">
          {tab === "fixos" ? (
            <RecurringManager
              items={recurrings}
              categories={categories}
              onItemsChange={setRecurrings}
            />
          ) : (
            <DailyForecastManager
              initialData={initialForecast}
              onTotalChange={setVariableTotal}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "neutral" | "folga";
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-background/80 px-4 py-3.5 shadow-sm backdrop-blur-sm",
        "transition-transform duration-300 hover:-translate-y-0.5",
        tone === "income" && "bg-gradient-to-br from-income/10 to-background/80",
        tone === "expense" &&
          "bg-gradient-to-br from-expense/10 to-background/80",
        tone === "folga" && "bg-gradient-to-br from-primary/10 to-background/80",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          emphasize ? "mt-1 text-2xl font-semibold tracking-tight" : "mt-1 text-xl font-semibold tracking-tight",
          tone === "income" && incomeClass(),
          tone === "expense" && expenseClass(),
          tone === "neutral" && moneyClass,
          tone === "folga" && balanceClass(value),
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}
