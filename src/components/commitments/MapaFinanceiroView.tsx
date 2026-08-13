"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { fetchMapaYearHeatAction } from "@/app/actions/mapa";
import { CommitmentsCalendar } from "@/components/commitments/CommitmentsCalendar";
import { MapaDayStage } from "@/components/commitments/MapaDayStage";
import { MonthDayList } from "@/components/commitments/MonthDayList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { balanceBand } from "@/lib/balance-insights";
import { buildCommitmentMap } from "@/lib/commitment-map";
import { copy } from "@/lib/copy";
import { balanceClass, moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { addDays, daysInMonth, summarizeMonthHeat } from "@/lib/mapa-snapshot";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  MapaDaySnapshot,
  MapaMonthSnapshot,
  MapaYearMonthHeat,
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
  cardDueDay: number;
  cardClosingDay: number;
  priorCardCharges?: Array<{ date: string; amount: number }>;
  initialView?: MapaView;
  initialDay?: string | null;
  snapshot: MapaMonthSnapshot;
  /** Prefetched year heat so J–D red dots appear without opening the overlay. */
  initialYearHeat?: MapaYearMonthHeat[] | null;
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

function clampDayInMonth(year: number, month: number, day: number) {
  const last = daysInMonth(year, month);
  return Math.min(Math.max(1, day), last);
}

function dateParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

function buildMapaUrl(input: {
  year: number;
  month: number;
  day?: string | null;
  view?: MapaView;
}) {
  const params = new URLSearchParams({
    year: String(input.year),
    month: String(input.month),
  });
  if (input.day) params.set("day", input.day);
  if (input.view === "lista") params.set("view", "lista");
  return `/mapa-financeiro?${params.toString()}`;
}

function heatBandClass(band: ReturnType<typeof balanceBand>) {
  if (band === "ok") return "border-income/30 bg-income/10";
  if (band === "low")
    return "border-amber-400/40 bg-amber-100/70 dark:bg-amber-950/40";
  return "border-expense/35 bg-expense/10";
}

/** Tailwind `lg` — sticky day column lives here; sheet is mobile-only. */
const LG_UP = "(min-width: 1024px)";

function isBelowLg() {
  if (typeof window === "undefined") return false;
  return !window.matchMedia(LG_UP).matches;
}

function invoiceProgress(closingDay: number, dueDay: number, asOfDay: number) {
  // Rough arc: purchases → close → pay
  const close = closingDay;
  const due = dueDay;
  if (asOfDay <= close) {
    return Math.min(0.45, (asOfDay / Math.max(close, 1)) * 0.45);
  }
  if (asOfDay < due) {
    const span = Math.max(due - close, 1);
    return 0.45 + ((asOfDay - close) / span) * 0.4;
  }
  return 1;
}

export function MapaFinanceiroView({
  recurrings,
  variableEstimate,
  categories,
  initialTransactions,
  year,
  month,
  today,
  cardDueDay,
  cardClosingDay,
  priorCardCharges = [],
  initialView = "mapa",
  initialDay = null,
  snapshot,
  initialYearHeat = null,
}: MapaFinanceiroViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<MapaView>(initialView);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [yearOverlayOpen, setYearOverlayOpen] = useState(false);
  const [yearHeat, setYearHeat] = useState<MapaYearMonthHeat[] | null>(
    initialYearHeat,
  );
  const [yearHeatLoading, setYearHeatLoading] = useState(
    !(initialYearHeat && initialYearHeat.length > 0),
  );
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const defaultSelected = useMemo(() => {
    if (
      initialDay &&
      initialDay.startsWith(
        `${year}-${String(month).padStart(2, "0")}-`,
      )
    ) {
      return initialDay;
    }
    const todayParts = dateParts(today);
    if (todayParts.year === year && todayParts.month === month) {
      return today;
    }
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [initialDay, year, month, today]);

  const [selectedDate, setSelectedDate] = useState<string>(defaultSelected);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    setSelectedDate(defaultSelected);
  }, [defaultSelected]);

  const map = useMemo(
    () => buildCommitmentMap(recurrings, year, month, variableEstimate),
    [recurrings, year, month, variableEstimate],
  );

  const snapshotByDate = useMemo(() => {
    const m = new Map<string, MapaDaySnapshot>();
    for (const day of snapshot.days) m.set(day.date, day);
    return m;
  }, [snapshot.days]);

  const selectedSnap = selectedDate
    ? (snapshotByDate.get(selectedDate) ?? null)
    : null;

  const monthHeat = useMemo(
    () => summarizeMonthHeat(snapshot.days, snapshot.lowThreshold),
    [snapshot.days, snapshot.lowThreshold],
  );

  const redMonths = useMemo(() => {
    const set = new Set<number>();
    if (monthHeat.hasRed) set.add(month);
    if (yearHeat) {
      for (const row of yearHeat) {
        if (row.hasRed) set.add(row.month);
      }
    }
    return set;
  }, [monthHeat.hasRed, month, yearHeat]);

  const planEventsForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const day = map.days.find((d) => d.date === selectedDate);
    return day?.events ?? [];
  }, [map.days, selectedDate]);

  const dueDateInMonth = useMemo(() => {
    const last = daysInMonth(year, month);
    const due = Math.min(cardDueDay, last);
    return `${year}-${String(month).padStart(2, "0")}-${String(due).padStart(2, "0")}`;
  }, [year, month, cardDueDay]);

  const pushUrl = useCallback(
    (
      next: {
        year: number;
        month: number;
        day?: string | null;
        view?: MapaView;
      },
      mode: "push" | "replace" = "push",
    ) => {
      const href = buildMapaUrl({
        year: next.year,
        month: next.month,
        day: next.day,
        view: next.view ?? view,
      });
      startTransition(() => {
        if (mode === "replace") {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
      });
    },
    [router, view],
  );

  const selectDay = useCallback(
    (date: string, opts?: { openMobileSheet?: boolean }) => {
      setSelectedDate(date);
      const parts = dateParts(date);
      if (parts.year !== year || parts.month !== month) {
        pushUrl({ year: parts.year, month: parts.month, day: date });
        return;
      }
      pushUrl({ year, month, day: date }, "replace");
      // Desktop: sticky column only — Sheet portals past CSS hide, so never open it at lg+.
      if (opts?.openMobileSheet && isBelowLg()) setMobileSheetOpen(true);
      else setMobileSheetOpen(false);
    },
    [year, month, pushUrl],
  );

  // If the viewport grows to lg+, drop any open mobile sheet (portal ignores CSS hide).
  useEffect(() => {
    const mq = window.matchMedia(LG_UP);
    const sync = () => {
      if (mq.matches) setMobileSheetOpen(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const goToday = useCallback(() => {
    const parts = dateParts(today);
    setMobileSheetOpen(false);
    if (parts.year === year && parts.month === month) {
      selectDay(today, { openMobileSheet: true });
      return;
    }
    pushUrl({ year: parts.year, month: parts.month, day: today });
  }, [today, year, month, selectDay, pushUrl]);

  const navigateMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(year, month, delta);
      const dayNum = selectedDate
        ? Number(selectedDate.slice(8, 10))
        : 1;
      const day = clampDayInMonth(next.year, next.month, dayNum);
      const dayStr = `${next.year}-${String(next.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setMobileSheetOpen(false);
      pushUrl({ year: next.year, month: next.month, day: dayStr });
    },
    [year, month, selectedDate, pushUrl],
  );

  const switchView = (next: MapaView) => {
    setView(next);
    pushUrl({ year, month, day: selectedDate, view: next }, "replace");
  };

  const refreshAfterChange = () => {
    router.refresh();
  };

  const onTransactionSaved = (tx: TransactionDTO) => {
    setTransactions((current) => {
      const without = current.filter((t) => t.id !== tx.id);
      return [...without, tx];
    });
  };

  // Keyboard: arrows = days; PageUp/Down = month; T = today
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (yearOverlayOpen) return;

      if (event.key === "t" || event.key === "T") {
        event.preventDefault();
        goToday();
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        navigateMonth(-1);
        return;
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        navigateMonth(1);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      const next = addDays(selectedDate, delta);
      selectDay(next, { openMobileSheet: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedDate,
    goToday,
    navigateMonth,
    selectDay,
    yearOverlayOpen,
  ]);

  // Prefetch year heat when RSC did not supply it, so J–D pills show red
  // dots without opening the year overlay.
  useEffect(() => {
    if (initialYearHeat && initialYearHeat.length > 0) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMapaYearHeatAction(year, today);
      if (cancelled) return;
      setYearHeatLoading(false);
      if (result.success && result.data) {
        setYearHeat(result.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [year, today, initialYearHeat]);

  const selectedIsToday = selectedDate === today;
  const balanceForCard = selectedIsToday
    ? snapshot.cards.todayBalance
    : (selectedSnap?.balance ?? snapshot.cards.todayBalance);
  const balanceBandForCard = balanceBand(
    balanceForCard,
    snapshot.lowThreshold,
  );
  const crunch = snapshot.cards.nextCrunch;
  const invoice = snapshot.cards.invoiceStory;
  const asOfDay = Number(
    (selectedIsToday ? today : selectedDate).slice(8, 10),
  );
  const progress = invoiceProgress(
    invoice.closingDay,
    invoice.dueDay,
    asOfDay,
  );

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

      <div className="relative space-y-5 p-4 sm:p-6 lg:p-7">
        {/* Time navigation */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={goToday}
              disabled={isPending}
            >
              {copy.mapaFinanceiro.today}
            </Button>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={copy.mapaFinanceiro.prevMonth}
                onClick={() => navigateMonth(-1)}
                disabled={isPending}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="min-w-[9.5rem] text-center text-base font-semibold capitalize tracking-tight sm:text-lg">
                {monthLabel(year, month)}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={copy.mapaFinanceiro.nextMonth}
                onClick={() => navigateMonth(1)}
                disabled={isPending}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-semibold tabular-nums"
              onClick={() => setYearOverlayOpen(true)}
            >
              {copy.mapaFinanceiro.yearLabel(year)}
            </Button>
          </div>

          <div
            role="navigation"
            aria-label={copy.mapaFinanceiro.monthPillsLabel}
            className="flex flex-wrap gap-1"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const active = m === month;
              const hasRed = redMonths.has(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-label={copy.mapaFinanceiro.monthPillAria(m, year)}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    const dayNum = selectedDate
                      ? Number(selectedDate.slice(8, 10))
                      : 1;
                    const day = clampDayInMonth(year, m, dayNum);
                    const dayStr = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    pushUrl({ year, month: m, day: dayStr });
                  }}
                  className={cn(
                    "relative rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {copy.mapaFinanceiro.monthPill(m)}
                  {hasRed ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-expense"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Three insight cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              selectDay(selectedIsToday ? today : selectedDate, {
                openMobileSheet: true,
              })
            }
            className={cn(
              "rounded-2xl border px-4 py-3.5 text-left transition-shadow hover:shadow-sm",
              heatBandClass(balanceBandForCard),
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {selectedIsToday
                ? copy.mapaFinanceiro.cardTodayBalance
                : copy.mapaFinanceiro.cardOnDayBalance}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tracking-tight",
                moneyClass,
                balanceClass(balanceForCard),
              )}
            >
              {formatCurrency(balanceForCard)}
            </p>
          </button>

          <button
            type="button"
            disabled={!crunch}
            onClick={() => {
              if (!crunch) return;
              selectDay(crunch.date, { openMobileSheet: true });
            }}
            className={cn(
              "rounded-2xl border border-border/60 bg-background/70 px-4 py-3.5 text-left transition-shadow",
              crunch && "hover:shadow-sm",
              !crunch && "opacity-90",
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {copy.mapaFinanceiro.cardNextCrunch}
            </p>
            {crunch ? (
              <>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  {copy.mapaFinanceiro.cardJumpCrunch}
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                    {crunch.date.slice(8, 10)}/{crunch.date.slice(5, 7)}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {copy.mapaFinanceiro.cardCrunchCause(
                    crunch.causeLabel,
                    formatCurrency(crunch.causeAmount),
                  )}
                </p>
              </>
            ) : (
              <p className="mt-1 text-base font-medium text-muted-foreground">
                {copy.mapaFinanceiro.cardNoCrunch}
              </p>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              selectDay(dueDateInMonth, { openMobileSheet: true })
            }
            className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.07] px-4 py-3.5 text-left transition-shadow hover:shadow-sm"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-violet-800 dark:text-violet-200">
              <CreditCard className="size-3.5" aria-hidden />
              {copy.mapaFinanceiro.cardInvoiceCycle}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {copy.mapaFinanceiro.cardInvoiceClosePay(
                invoice.closingDay,
                invoice.dueDay,
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.mapaFinanceiro.cardInvoiceOpen}
            </p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                moneyClass,
              )}
            >
              {formatCurrency(invoice.openAmount)}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-500/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-slate-500 to-amber-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
              {copy.mapaFinanceiro.cardJumpPay}
              {invoice.dueAmount > 0
                ? ` · ${formatCurrency(invoice.dueAmount)}`
                : null}
            </p>
          </button>
        </div>

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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-background/80 to-background/40 p-2.5 shadow-sm backdrop-blur-sm sm:p-4">
              <CommitmentsCalendar
                year={year}
                month={month}
                days={map.days}
                today={today}
                selectedDate={selectedDate}
                cardDueDay={cardDueDay}
                cardClosingDay={cardClosingDay}
                priorCardCharges={priorCardCharges}
                transactions={transactions}
                snapshotDays={snapshot.days}
                lowThreshold={snapshot.lowThreshold}
                onSelectDay={(date) =>
                  selectDay(date, { openMobileSheet: true })
                }
              />
            </div>
            <div className="hidden lg:block">
              <MapaDayStage
                variant="panel"
                date={selectedDate}
                today={today}
                daySnapshot={selectedSnap}
                planEvents={planEventsForSelected}
                transactions={transactions}
                categories={categories}
                onChanged={refreshAfterChange}
                onTransactionSaved={onTransactionSaved}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            <MonthDayList
              days={map.days}
              today={today}
              transactions={transactions}
              onSelectDay={(date) =>
                selectDay(date, { openMobileSheet: true })
              }
              onRegisterToday={() =>
                selectDay(today, { openMobileSheet: true })
              }
            />
            <div className="hidden lg:block">
              <MapaDayStage
                variant="panel"
                date={selectedDate}
                today={today}
                daySnapshot={selectedSnap}
                planEvents={planEventsForSelected}
                transactions={transactions}
                categories={categories}
                onChanged={refreshAfterChange}
                onTransactionSaved={onTransactionSaved}
              />
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {copy.mapaFinanceiro.folgaFooter(formatCurrency(map.folga))}
          {" · "}
          <Link
            href="/gastos-fixos"
            className="font-medium text-primary hover:underline"
          >
            {copy.mapaFinanceiro.folgaFooterLink}
          </Link>
        </p>
      </div>

      {/* Sheet portals to body — open state is gated to below-lg in selectDay. */}
      <MapaDayStage
        variant="sheet"
        sheetOpen={mobileSheetOpen}
        onSheetOpenChange={setMobileSheetOpen}
        date={selectedDate}
        today={today}
        daySnapshot={selectedSnap}
        planEvents={planEventsForSelected}
        transactions={transactions}
        categories={categories}
        onChanged={refreshAfterChange}
        onTransactionSaved={onTransactionSaved}
      />

      <Dialog open={yearOverlayOpen} onOpenChange={setYearOverlayOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{copy.mapaFinanceiro.yearOverlayTitle}</DialogTitle>
            <DialogDescription>
              {copy.mapaFinanceiro.yearOverlaySubtitle}
            </DialogDescription>
          </DialogHeader>
          {yearHeatLoading || !yearHeat ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.mapaFinanceiro.yearOverlayLoading}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {yearHeat.map((row) => {
                const label = new Intl.DateTimeFormat("pt-BR", {
                  month: "short",
                })
                  .format(new Date(year, row.month - 1, 1))
                  .replace(".", "");
                return (
                  <button
                    key={row.month}
                    type="button"
                    onClick={() => {
                      setYearOverlayOpen(false);
                      const dayNum = selectedDate
                        ? Number(selectedDate.slice(8, 10))
                        : 1;
                      const day = clampDayInMonth(year, row.month, dayNum);
                      const dayStr = `${year}-${String(row.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      pushUrl({ year, month: row.month, day: dayStr });
                    }}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm font-semibold capitalize transition-opacity hover:opacity-90",
                      row.band === "ok" && "border-income/30 bg-income/25",
                      row.band === "low" &&
                        "border-amber-400/40 bg-amber-200/80 dark:bg-amber-900/50",
                      row.band === "bad" &&
                        "border-expense/40 bg-expense/35 text-expense",
                      row.month === month && "ring-2 ring-primary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
