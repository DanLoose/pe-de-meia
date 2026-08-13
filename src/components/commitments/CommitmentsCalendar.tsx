"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  Lock,
  Wallet,
} from "lucide-react";
import { MapaCycleRibbon } from "@/components/commitments/MapaCycleRibbon";
import { cn } from "@/lib/utils";
import type { CommitmentMapDay, CommitmentMapEvent } from "@/lib/commitment-map";
import {
  calendarEventsForDay,
  dayCardCharges,
  dayCashNet,
} from "@/lib/day-items";
import {
  buildOpenInvoiceRunningByDate,
  isCardClosingDay,
  type CardChargePoint,
} from "@/lib/mapa-card-invoice";
import { balanceBand } from "@/lib/balance-insights";
import { copy } from "@/lib/copy";
import { expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { shouldShowOpenInvoiceFooter } from "@/lib/mapa-snapshot";
import type { MapaDaySnapshot, TransactionDTO } from "@/types";

const DOW_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const DOW_FULL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MAX_VISIBLE = 2;

interface CommitmentsCalendarProps {
  year: number;
  month: number;
  days: CommitmentMapDay[];
  today: string;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  cardDueDay?: number | null;
  cardClosingDay?: number | null;
  priorCardCharges?: CardChargePoint[];
  transactions?: TransactionDTO[];
  /** Snapshot days drive cell heat + payday/due flags. */
  snapshotDays?: MapaDaySnapshot[];
  lowThreshold?: number;
}

function isInvoicePayment(event: CommitmentMapEvent) {
  return event.payMode === "card" && event.affectsCash;
}

function heatClass(band: ReturnType<typeof balanceBand>) {
  if (band === "ok") return "bg-income/[0.14]";
  if (band === "low")
    return "bg-amber-200/45 dark:bg-amber-900/35";
  return "bg-expense/[0.18]";
}

function DayMovements({
  events,
  openInvoiceRunning,
  highlightCardClosing,
}: {
  events: CommitmentMapEvent[];
  openInvoiceRunning: number;
  highlightCardClosing: boolean;
}) {
  if (events.length === 0 && openInvoiceRunning <= 0) {
    return null;
  }

  const visible = events.slice(0, MAX_VISIBLE);
  const extra = events.length - visible.length;
  const cashNet = dayCashNet(events);
  const cardChargesToday = dayCardCharges(events);
  const cashEvents = events.filter((e) => e.affectsCash);
  const showCashTotal = cashEvents.length > 1;
  const showOpenInvoice = shouldShowOpenInvoiceFooter({
    openInvoice: openInvoiceRunning,
    cardChargesToday,
    isClosing: highlightCardClosing,
  });

  return (
    <div className="mt-1 flex min-h-0 w-full flex-1 flex-col gap-0.5">
      {visible.map((event) => {
        const isIncome = event.type === "INCOME";
        const isCard = event.payMode === "card";
        const payment = isInvoicePayment(event);
        const SignIcon = isIncome ? ArrowUp : ArrowDown;
        const PayIcon = isCard ? CreditCard : Wallet;
        const signLabel = isIncome
          ? copy.commitmentsMap.legendIncome
          : copy.commitmentsMap.legendExpense;
        const payLabel = payment
          ? copy.commitmentsMap.cardInvoicePayLabel
          : isCard
            ? copy.commitmentsMap.legendPayCard
            : copy.commitmentsMap.legendPayCash;
        const signedAmount = isIncome ? event.amount : -event.amount;

        return (
          <span
            key={event.id}
            className="flex min-w-0 items-center gap-1"
            title={`${event.label} · ${signLabel} · ${payLabel}`}
          >
            <span
              className={cn(
                "inline-flex size-3.5 shrink-0 items-center justify-center rounded-md sm:size-4",
                isIncome
                  ? "bg-income/20 text-income"
                  : "bg-expense/20 text-expense",
              )}
              aria-hidden
            >
              <SignIcon className="size-2.5 sm:size-3" strokeWidth={2.75} />
            </span>
            <span
              className={cn(
                "inline-flex size-3.5 shrink-0 items-center justify-center rounded-md sm:size-4",
                payment
                  ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                  : isCard
                    ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                    : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <PayIcon className="size-2.5 sm:size-3" strokeWidth={2.5} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[9px] font-medium leading-tight text-foreground/75 sm:text-[10px]">
              {payment ? copy.commitmentsMap.cardInvoicePayLabel : event.label}
            </span>
            {event.affectsCash ? (
              <span
                className={cn(
                  "shrink-0 text-[9px] font-semibold tabular-nums sm:text-[10px]",
                  signedAmount > 0
                    ? incomeClass()
                    : signedAmount < 0
                      ? expenseClass()
                      : "text-muted-foreground",
                )}
              >
                {signedAmount > 0 ? "+" : signedAmount < 0 ? "−" : ""}
                {formatCurrency(Math.abs(signedAmount))}
              </span>
            ) : null}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="pt-0.5 text-[9px] font-semibold leading-none text-muted-foreground sm:text-[10px]">
          {copy.commitmentsMap.dayMore(extra)}
        </span>
      ) : null}
      {showCashTotal || showOpenInvoice ? (
        <div className="mt-auto space-y-0.5 border-t border-border/40 pt-1">
          {showCashTotal ? (
            <span
              className={cn(
                "block text-[9px] font-semibold leading-none sm:text-[10px]",
                moneyClass,
                cashNet > 0
                  ? incomeClass()
                  : cashNet < 0
                    ? expenseClass()
                    : "text-muted-foreground",
              )}
              title={copy.commitmentsMap.dayTotalTitle}
            >
              {cashNet > 0 ? "+" : cashNet < 0 ? "−" : ""}
              {formatCurrency(Math.abs(cashNet))}
            </span>
          ) : null}
          {showOpenInvoice ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[9px] font-semibold leading-none text-violet-700 sm:text-[10px] dark:text-violet-300",
                moneyClass,
              )}
              title={copy.commitmentsMap.dayCardInvoiceTitle}
            >
              <CreditCard className="size-2.5 shrink-0" aria-hidden />
              {formatCurrency(openInvoiceRunning)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CommitmentsCalendar({
  year,
  month,
  days,
  today,
  selectedDate,
  onSelectDay,
  cardDueDay = null,
  cardClosingDay = null,
  priorCardCharges = [],
  transactions = [],
  snapshotDays = [],
  lowThreshold = 500,
}: CommitmentsCalendarProps) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startPad = first.getUTCDay();
  const lastDay = days[days.length - 1]?.day ?? 31;
  const dueDay =
    cardDueDay != null && cardDueDay >= 1
      ? Math.min(cardDueDay, lastDay)
      : null;
  const closingDay =
    cardClosingDay != null && cardClosingDay >= 1
      ? Math.min(cardClosingDay, lastDay)
      : null;

  const snapshotByDate = useMemo(() => {
    const map = new Map<string, MapaDaySnapshot>();
    for (const day of snapshotDays) map.set(day.date, day);
    return map;
  }, [snapshotDays]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CommitmentMapEvent[]>();
    for (const day of days) {
      map.set(
        day.date,
        calendarEventsForDay(day.events, transactions, day.date, today),
      );
    }
    return map;
  }, [days, transactions, today]);

  const cardCharges = useMemo(() => {
    const points: CardChargePoint[] = [...priorCardCharges];
    const seen = new Set(
      priorCardCharges.map((c) => `${c.date}:${c.amount}`),
    );
    for (const day of days) {
      const events = eventsByDate.get(day.date) ?? [];
      for (const event of events) {
        if (event.payMode !== "card" || event.affectsCash) continue;
        const key = `${event.date}:${event.amount}:${event.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        points.push({ date: event.date, amount: event.amount });
      }
    }
    return points;
  }, [days, eventsByDate, priorCardCharges]);

  const openInvoiceByDate = useMemo(() => {
    if (closingDay == null || dueDay == null) {
      return new Map<string, number>();
    }
    return buildOpenInvoiceRunningByDate(
      days.map((d) => d.date),
      cardCharges,
      closingDay,
      dueDay,
    );
  }, [days, cardCharges, closingDay, dueDay]);

  const cells: ReactNode[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push(
      <div
        key={`pad-${i}`}
        className="min-h-[5.5rem] rounded-2xl bg-muted/20 sm:min-h-[7rem]"
        aria-hidden
      />,
    );
  }

  for (const day of days) {
    const isToday = day.date === today;
    const isSelected = day.date === selectedDate;
    const snap = snapshotByDate.get(day.date);
    const isCardClosing =
      snap?.flags.closing ??
      (closingDay != null && isCardClosingDay(day.date, closingDay));
    const isDue = snap?.flags.due ?? false;
    const isPayday = snap?.flags.payday ?? false;
    const events = eventsByDate.get(day.date) ?? [];
    const hasCardPurchase = dayCardCharges(events) > 0;
    const hasInvoicePayment = events.some(isInvoicePayment);
    const openInvoiceRunning =
      snap?.openInvoice ?? openInvoiceByDate.get(day.date) ?? 0;
    const hasEvents = events.length > 0;
    const weekday = new Date(Date.UTC(year, month - 1, day.day)).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const band =
      snap != null
        ? balanceBand(snap.balance, lowThreshold)
        : null;

    cells.push(
      <button
        key={day.date}
        type="button"
        onClick={() => onSelectDay(day.date)}
        className={cn(
          "group relative flex min-h-[5.5rem] flex-col rounded-2xl border p-1.5 text-left sm:min-h-[7rem] sm:p-2",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          band ? heatClass(band) : null,
          !band &&
            !hasEvents &&
            "border-border/50 bg-muted/25 hover:border-border hover:bg-background hover:shadow-sm",
          !band &&
            hasEvents &&
            "border-border/55 bg-background/75 hover:border-border hover:bg-background hover:shadow-sm",
          isWeekend && !hasEvents && !band && "bg-muted/40",
          hasCardPurchase && "border-l-[3px] border-l-violet-500",
          hasInvoicePayment && "border-l-[3px] border-l-amber-500",
          isCardClosing && "border-slate-400/50",
          isSelected &&
            "z-[1] border-primary/50 shadow-[0_8px_24px_-12px_rgba(15,40,35,0.45)] ring-2 ring-primary/25",
          isToday && !isSelected && "ring-1 ring-primary/40",
          isCardClosing && !isSelected && "ring-1 ring-slate-400/40",
        )}
        aria-label={
          isCardClosing
            ? copy.commitmentsMap.cardClosingDayAria(day.day)
            : isDue
              ? copy.commitmentsMap.cardDueDayAria(day.day)
              : `${copy.ledger.day} ${day.day}`
        }
        aria-pressed={isSelected}
      >
        <span className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors sm:size-7 sm:text-[13px]",
              isToday
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground group-hover:text-foreground",
              isSelected && !isToday && "bg-foreground text-background",
              hasEvents && !isToday && !isSelected && "text-foreground",
              isCardClosing &&
                !isToday &&
                !isSelected &&
                "text-slate-700 dark:text-slate-300",
            )}
          >
            {day.day}
          </span>
          <span className="inline-flex items-center gap-0.5">
            {isPayday ? (
              <span
                className="inline-flex size-5 items-center justify-center rounded-full bg-income/20 text-income"
                title={copy.mapaFinanceiro.legendPayday}
              >
                <ArrowUp className="size-3" strokeWidth={2.75} aria-hidden />
              </span>
            ) : null}
            {isDue ? (
              <span
                className="inline-flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200"
                title={copy.commitmentsMap.cardInvoicePayLabel}
              >
                <CreditCard className="size-3" aria-hidden />
              </span>
            ) : null}
            {isCardClosing ? (
              <span
                className="inline-flex size-5 items-center justify-center rounded-full bg-slate-600 text-white shadow-sm"
                title={copy.commitmentsMap.legendCardClosing}
              >
                <Lock className="size-3" aria-hidden />
              </span>
            ) : null}
          </span>
        </span>
        <DayMovements
          events={events}
          openInvoiceRunning={openInvoiceRunning}
          highlightCardClosing={isCardClosing}
        />
        {isCardClosing && events.length === 0 && openInvoiceRunning <= 0 ? (
          <span className="mt-1 truncate text-[9px] font-medium leading-tight text-slate-600/90 sm:text-[10px] dark:text-slate-300/90">
            {copy.commitmentsMap.cardClosingDayLabel}
          </span>
        ) : null}
      </button>,
    );
  }

  return (
    <div className="space-y-3.5">
      {closingDay != null && dueDay != null ? (
        <MapaCycleRibbon
          year={year}
          month={month}
          closingDay={closingDay}
          dueDay={dueDay}
          startPad={startPad}
        />
      ) : null}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DOW_SHORT.map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            <span className="sm:hidden">{d}</span>
            <span className="hidden sm:inline">{DOW_FULL[i]}</span>
          </div>
        ))}
        {cells}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-income/40" />
          {copy.mapaFinanceiro.legendHeat}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-md bg-income/20 text-income">
            <ArrowUp className="size-3" strokeWidth={2.75} aria-hidden />
          </span>
          {copy.mapaFinanceiro.legendPayday}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Wallet className="size-3" strokeWidth={2.5} aria-hidden />
          </span>
          {copy.commitmentsMap.legendPayCash}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex size-4 items-center justify-center rounded-md bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <CreditCard className="size-3" strokeWidth={2.5} aria-hidden />
          </span>
          {copy.commitmentsMap.legendPayCard}
        </span>
        {closingDay != null ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-slate-600 text-white">
              <Lock className="size-2.5" aria-hidden />
            </span>
            {copy.commitmentsMap.legendCardClosing}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" />
          {copy.calendar.today}
        </span>
      </div>
    </div>
  );
}
