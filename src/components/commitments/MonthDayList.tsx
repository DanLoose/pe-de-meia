"use client";

import { ArrowDown, ArrowUp, Check, CreditCard, Plus, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CommitmentMapDay } from "@/lib/commitment-map";
import { copy } from "@/lib/copy";
import {
  dayItemAmount,
  dayItemLabel,
  dayItemType,
  dayMatchesFilter,
  filterItemsForView,
  mergeDayItems,
} from "@/lib/day-items";
import { payModeFromLedgerColumn } from "@/lib/commitment-map";
import { expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types";

type DayFilter = "all" | "motion" | "fixed" | "registered";

interface MonthDayListProps {
  days: CommitmentMapDay[];
  today: string;
  transactions: TransactionDTO[];
  onSelectDay: (date: string) => void;
  onRegisterToday: () => void;
}

const DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const FILTERS: { id: DayFilter; label: string }[] = [
  { id: "all", label: copy.mapaFinanceiro.filterAll },
  { id: "motion", label: copy.mapaFinanceiro.filterMotion },
  { id: "fixed", label: copy.mapaFinanceiro.filterFixed },
  { id: "registered", label: copy.mapaFinanceiro.filterRegistered },
];

function registeredNet(txs: TransactionDTO[]) {
  return txs.reduce((sum, tx) => {
    if (tx.type === "INCOME") return sum + tx.amount;
    return sum - tx.amount;
  }, 0);
}

export function MonthDayList({
  days,
  today,
  transactions,
  onSelectDay,
  onRegisterToday,
}: MonthDayListProps) {
  const [filter, setFilter] = useState<DayFilter>("all");
  const todayRef = useRef<HTMLLIElement>(null);
  const didScroll = useRef(false);

  const byDate = useMemo(() => {
    const map = new Map<string, TransactionDTO[]>();
    for (const tx of transactions) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [transactions]);

  const todayInMonth = days.some((d) => d.date === today);

  const visibleDays = useMemo(() => {
    return days.filter((day) => {
      const txs = byDate.get(day.date) ?? [];
      let items = mergeDayItems(day.events, txs);
      // Past days: hide plan ghosts after occurrence was deleted in Projeção/sheet.
      if (day.date < today) {
        items = items.filter(
          (item) =>
            item.kind === "extra" ||
            (item.kind === "plan" && item.status === "done"),
        );
      }
      return dayMatchesFilter(items, filter);
    });
  }, [days, byDate, filter, today]);

  useEffect(() => {
    didScroll.current = false;
  }, [days, filter]);

  useEffect(() => {
    if (didScroll.current || !todayInMonth) return;
    if (filter !== "all" && filter !== "motion") {
      const todayVisible = visibleDays.some((d) => d.date === today);
      if (!todayVisible) return;
    }
    const node = todayRef.current;
    if (!node) return;
    didScroll.current = true;
    requestAnimationFrame(() => {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [visibleDays, todayInMonth, filter, today]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-sm backdrop-blur-sm">
      <div className="space-y-3 border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">
              {copy.mapaFinanceiro.listTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {copy.mapaFinanceiro.listSubtitle}
            </p>
          </div>
          {todayInMonth ? (
            <Button size="sm" onClick={onRegisterToday}>
              <Plus className="size-4" />
              {copy.mapaFinanceiro.listRegisterToday}
            </Button>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label={copy.mapaFinanceiro.listFilters}
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {visibleDays.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          {filter === "fixed"
            ? copy.mapaFinanceiro.filterEmptyFixed
            : filter === "registered"
              ? copy.mapaFinanceiro.filterEmptyRegistered
              : copy.mapaFinanceiro.filterEmpty}
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {visibleDays.map((day) => {
            const txs = byDate.get(day.date) ?? [];
            let allItems = mergeDayItems(day.events, txs);
            if (day.date < today) {
              allItems = allItems.filter(
                (item) =>
                  item.kind === "extra" ||
                  (item.kind === "plan" && item.status === "done"),
              );
            }
            const items = filterItemsForView(allItems, filter);
            const isToday = day.date === today;
            const isEmpty = items.length === 0;
            const [y, m, d] = day.date.split("-").map(Number);
            const weekday =
              DOW[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()] ?? "";
            const netTxs =
              filter === "fixed"
                ? []
                : filter === "registered"
                  ? items
                      .filter((item) => item.kind === "extra")
                      .map((item) => item.transaction)
                  : txs;
            const net = registeredNet(netTxs);
            const preview = items.slice(0, 4);

            return (
              <li key={day.date} ref={isToday ? todayRef : undefined}>
                <button
                  type="button"
                  onClick={() => onSelectDay(day.date)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 text-left transition-colors sm:px-5",
                    "hover:bg-primary/[0.04]",
                    isToday && "bg-primary/[0.06]",
                    isEmpty && !isToday ? "py-1.5" : "py-3",
                  )}
                >
                  <div
                    className={cn(
                      "flex shrink-0 flex-col items-center justify-center rounded-2xl text-xs font-semibold",
                      isEmpty && !isToday ? "size-9" : "size-11",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    <span className="text-[9px] uppercase opacity-80">
                      {weekday}
                    </span>
                    <span className="tabular-nums leading-none">{day.day}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEmpty ? (
                      <p
                        className={cn(
                          "text-muted-foreground",
                          isToday ? "text-sm" : "text-xs",
                        )}
                      >
                        {isToday
                          ? copy.mapaFinanceiro.daySheetEmpty
                          : copy.mapaFinanceiro.listEmptyDay}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {preview.map((item) => {
                          const type = dayItemType(item);
                          const done =
                            item.kind === "plan"
                              ? item.status === "done"
                              : true;
                          const pending =
                            item.kind === "plan" && item.status === "pending";
                          const SignIcon =
                            type === "INCOME" ? ArrowUp : ArrowDown;
                          const payMode =
                            item.kind === "plan"
                              ? item.transaction
                                ? payModeFromLedgerColumn(
                                    item.transaction.ledgerColumn,
                                  )
                                : item.event.payMode
                              : payModeFromLedgerColumn(
                                  item.transaction.ledgerColumn,
                                );
                          const PayIcon =
                            payMode === "card" ? CreditCard : Wallet;

                          return (
                            <span
                              key={
                                item.kind === "plan"
                                  ? item.event.id
                                  : item.transaction.id
                              }
                              className={cn(
                                "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium",
                                pending &&
                                  (type === "INCOME"
                                    ? "border border-income/30 bg-transparent text-income/80"
                                    : "border border-expense/30 bg-transparent text-expense/80"),
                                done &&
                                  type === "INCOME" &&
                                  "bg-income/15 text-income",
                                done &&
                                  type === "EXPENSE" &&
                                  "bg-expense/15 text-expense",
                              )}
                            >
                              {done ? (
                                <Check
                                  className="size-3 shrink-0 opacity-80"
                                  aria-hidden
                                />
                              ) : null}
                              <SignIcon
                                className="size-3 shrink-0 opacity-80"
                                aria-hidden
                              />
                              <PayIcon
                                className="size-3 shrink-0 opacity-80"
                                aria-hidden
                              />
                              <span className="truncate">
                                {dayItemLabel(item)}
                              </span>
                              <span className={moneyClass}>
                                {formatCurrency(dayItemAmount(item))}
                              </span>
                            </span>
                          );
                        })}
                        {items.length > preview.length ? (
                          <span className="self-center text-[11px] text-muted-foreground">
                            {copy.mapaFinanceiro.listMoreItems(
                              items.length - preview.length,
                            )}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {netTxs.length > 0 && net !== 0 ? (
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          moneyClass,
                          net > 0 ? incomeClass() : expenseClass(),
                        )}
                      >
                        {formatCurrency(net)}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground",
                        isEmpty && !isToday ? "size-7" : "size-8",
                      )}
                    >
                      <Plus
                        className={cn(
                          isEmpty && !isToday ? "size-3.5" : "size-4",
                        )}
                      />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
