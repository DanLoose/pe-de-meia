"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CommitmentsCalendar } from "@/components/commitments/CommitmentsCalendar";
import { CommitmentsComposition } from "@/components/commitments/CommitmentsComposition";
import { DayRegisterForm } from "@/components/commitments/DayRegisterForm";
import { MapaDaySheet } from "@/components/commitments/MapaDaySheet";
import { MonthDayList } from "@/components/commitments/MonthDayList";
import { Button } from "@/components/ui/button";
import { buildCommitmentMap } from "@/lib/commitment-map";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  RecurringTransactionDTO,
  TransactionDTO,
} from "@/types";

type MapaView = "mapa" | "lista";

interface MapaFinanceiroViewProps {
  recurrings: RecurringTransactionDTO[];
  variableEstimate: number;
  categories: CategoryDTO[];
  initialTransactions: TransactionDTO[];
  year: number;
  month: number;
  today: string;
  initialView?: MapaView;
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

export function MapaFinanceiroView({
  recurrings,
  variableEstimate,
  categories,
  initialTransactions,
  year,
  month,
  today,
  initialView = "mapa",
}: MapaFinanceiroViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<MapaView>(initialView);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null);
  const [registerDate, setRegisterDate] = useState<string | null>(null);
  const [transactions, setTransactions] = useState(initialTransactions);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  const map = useMemo(
    () => buildCommitmentMap(recurrings, year, month, variableEstimate),
    [recurrings, year, month, variableEstimate],
  );

  const selectedDay = map.days.find((d) => d.date === selectedDate) ?? null;
  const daySheetDay = map.days.find((d) => d.date === daySheetDate) ?? null;
  const monthKey = `${year}-${month}`;

  const navigateMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    setSelectedDate(null);
    setDaySheetDate(null);
    startTransition(() => {
      const params = new URLSearchParams({
        year: String(next.year),
        month: String(next.month),
      });
      if (view === "lista") params.set("view", "lista");
      router.push(`/mapa-financeiro?${params.toString()}`, { scroll: false });
    });
  };

  const switchView = (next: MapaView) => {
    setView(next);
    setSelectedDate(null);
    setDaySheetDate(null);
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (next === "lista") params.set("view", "lista");
    startTransition(() => {
      router.replace(`/mapa-financeiro?${params.toString()}`, {
        scroll: false,
      });
    });
  };

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
        className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-income/10 blur-3xl"
      />

      <div className="relative space-y-6 p-4 sm:p-6 lg:p-7">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {view === "mapa"
                ? copy.commitmentsMap.eyebrow
                : copy.mapaFinanceiro.listEyebrow}
            </p>
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
              <h2 className="min-w-[10rem] text-center text-lg font-semibold capitalize tracking-tight sm:text-xl">
                {monthLabel(year, month)}
              </h2>
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
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {view === "mapa"
                ? copy.commitmentsMap.subtitle
                : copy.mapaFinanceiro.listIntro}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href="/gastos-fixos"
              className="text-sm font-medium text-primary hover:underline"
            >
              {copy.commitmentsMap.editCommitments}
            </Link>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <Link
              href="/horizonte"
              className="text-sm font-medium text-primary hover:underline"
            >
              {copy.commitmentsMap.seeFolga}
            </Link>
          </div>
        </header>

        <div
          role="tablist"
          aria-label={copy.mapaFinanceiro.viewToggle}
          className="inline-flex rounded-2xl border border-border/60 bg-background/70 p-1 shadow-sm backdrop-blur-sm"
        >
          {(
            [
              { id: "mapa", label: copy.mapaFinanceiro.viewMap },
              { id: "lista", label: copy.mapaFinanceiro.viewList },
            ] as const
          ).map((item) => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchView(item.id)}
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

        {view === "mapa" ? (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.85fr)] lg:items-start">
              <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-background/80 to-background/40 p-2.5 shadow-sm backdrop-blur-sm sm:p-4">
                <CommitmentsCalendar
                  year={year}
                  month={month}
                  days={map.days}
                  today={today}
                  selectedDate={selectedDate}
                  onSelectDay={(date) =>
                    setSelectedDate((prev) => (prev === date ? null : date))
                  }
                />
              </div>

              <aside className="space-y-3">
                <KpiCard
                  label={copy.commitmentsMap.expectedIncome}
                  value={map.fixedIncome}
                  tone="income"
                />
                <KpiCard
                  label={copy.commitmentsMap.expectedExpense}
                  value={map.fixedExpense + map.variableEstimate}
                  tone="expense"
                  hint={
                    map.variableEstimate > 0
                      ? copy.commitmentsMap.expectedExpenseHint(
                          formatCurrency(map.fixedExpense),
                          formatCurrency(map.variableEstimate),
                        )
                      : undefined
                  }
                />
                <div
                  className={cn(
                    "rounded-3xl border border-border/60 bg-background/80 px-4 py-4 shadow-sm backdrop-blur-sm",
                    "transition-transform duration-300 hover:-translate-y-0.5",
                  )}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {copy.commitmentsMap.expectedFolga}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-3xl font-semibold tracking-tight",
                      moneyClass,
                      balanceClass(map.folga),
                    )}
                  >
                    {formatCurrency(map.folga)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy.commitmentsMap.folgaHint}
                  </p>
                </div>
              </aside>
            </div>

            {selectedDay && selectedDay.events.length > 0 ? (
              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 rounded-3xl border border-border/60 bg-background/75 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {copy.commitmentsMap.dayEvents(selectedDay.day)}
                </p>
                <ul className="mt-2 divide-y divide-border/60">
                  {selectedDay.events.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            event.type === "INCOME"
                              ? "bg-income"
                              : "bg-expense",
                          )}
                        />
                        <span className="truncate font-medium">
                          {event.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.type === "INCOME"
                            ? copy.commitmentsMap.badgeIncome
                            : copy.commitmentsMap.badgeExpense}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          event.type === "INCOME"
                            ? incomeClass()
                            : expenseClass(),
                        )}
                      >
                        {formatCurrency(event.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight">
                {copy.commitmentsMap.compositionTitle}
              </h3>
              <p className="text-sm text-muted-foreground">
                {copy.commitmentsMap.compositionSubtitle}
              </p>
              <CommitmentsComposition
                slices={map.slices}
                costOfLiving={map.costOfLiving}
                monthKey={monthKey}
              />
            </div>
          </>
        ) : (
          <MonthDayList
            days={map.days}
            today={today}
            transactions={transactions}
            onSelectDay={setDaySheetDate}
            onRegisterToday={() => setRegisterDate(today)}
          />
        )}
      </div>

      <MapaDaySheet
        open={daySheetDate !== null}
        onOpenChange={(open) => {
          if (!open) setDaySheetDate(null);
        }}
        date={daySheetDate}
        planEvents={daySheetDay?.events ?? []}
        transactions={transactions}
        onAdd={() => {
          if (daySheetDate) setRegisterDate(daySheetDate);
        }}
        onDeleted={(id) => {
          setTransactions((current) => current.filter((tx) => tx.id !== id));
        }}
      />

      <DayRegisterForm
        open={registerDate !== null}
        onOpenChange={(open) => {
          if (!open) setRegisterDate(null);
        }}
        date={registerDate}
        categories={categories}
        onSaved={(tx) => {
          setTransactions((current) => [...current, tx]);
        }}
      />
    </section>
  );
}

function KpiCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "income" | "expense";
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-background/80 px-4 py-3.5 shadow-sm backdrop-blur-sm",
        "transition-transform duration-300 hover:-translate-y-0.5",
        tone === "income" && "bg-gradient-to-br from-income/10 to-background/80",
        tone === "expense" &&
          "bg-gradient-to-br from-expense/10 to-background/80",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          tone === "income" ? incomeClass() : expenseClass(),
        )}
      >
        {formatCurrency(value)}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
