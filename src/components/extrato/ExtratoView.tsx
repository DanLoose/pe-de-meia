"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTransactionSeriesAction,
  fetchTransactionSeriesInfoAction,
} from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copy } from "@/lib/copy";
import { expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency, formatShortDateLabel } from "@/lib/format";
import { LEDGER_COLUMN_LABELS } from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types";

type OriginFilter = "all" | "fixed" | "oneOff";
type TypeFilter = "all" | "INCOME" | "EXPENSE";
type SeriesInfo = { count: number; kind: "recurring" | "orphan" | "single" };

interface ExtratoViewProps {
  year: number;
  month: number;
  initialTransactions: TransactionDTO[];
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

const ORIGIN_FILTERS: { id: OriginFilter; label: string }[] = [
  { id: "all", label: copy.extrato.filterAll },
  { id: "fixed", label: copy.extrato.filterFixed },
  { id: "oneOff", label: copy.extrato.filterOneOff },
];

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: copy.extrato.typeAll },
  { id: "INCOME", label: copy.extrato.typeIncome },
  { id: "EXPENSE", label: copy.extrato.typeExpense },
];

export function ExtratoView({
  year,
  month,
  initialTransactions,
}: ExtratoViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!pendingDeleteId) {
      setSeriesInfo(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await fetchTransactionSeriesInfoAction(pendingDeleteId);
      if (cancelled) return;
      if (result.success && result.data) {
        setSeriesInfo(result.data);
      } else {
        setSeriesInfo({ count: 1, kind: "single" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingDeleteId]);

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (origin === "fixed" && !tx.recurringId) return false;
        if (origin === "oneOff" && tx.recurringId) return false;
        if (type !== "all" && tx.type !== type) return false;
        return true;
      })
      .sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return (b.description ?? "").localeCompare(a.description ?? "");
      });
  }, [transactions, origin, type]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, tx) => {
        if (tx.type === "INCOME") acc.income += tx.amount;
        else acc.expense += tx.amount;
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [filtered]);

  const navigateMonth = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    startTransition(() => {
      router.push(`/extrato?year=${next.year}&month=${next.month}`, {
        scroll: false,
      });
    });
  };

  const confirmDelete = (scope: "one" | "series") => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    const target = transactions.find((tx) => tx.id === id);
    const previous = transactions;
    setPendingDeleteId(null);

    startDeleteTransition(async () => {
      const result = await deleteTransactionSeriesAction(id, scope);
      if (!result.success || !result.data) {
        setTransactions(previous);
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }

      const deleted = new Set(result.data.deletedIds);
      setTransactions((current) => {
        if (scope === "series" && target && !target.recurringId) {
          const label = (target.description ?? "").trim().toLowerCase();
          const day = Number(target.date.split("-")[2]);
          return current.filter((tx) => {
            if (deleted.has(tx.id)) return false;
            if (tx.recurringId) return true;
            if (tx.type !== target.type) return true;
            if (tx.amount !== target.amount) return true;
            if ((tx.description ?? "").trim().toLowerCase() !== label) {
              return true;
            }
            return Number(tx.date.split("-")[2]) !== day;
          });
        }
        return current.filter((tx) => !deleted.has(tx.id));
      });
      appToast.success(
        copy.extrato.deleteSeriesDone(result.data.deletedIds.length),
      );
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
              {copy.extrato.eyebrow}
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
              {copy.extrato.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href="/gastos-fixos"
              className="text-sm font-medium text-primary hover:underline"
            >
              {copy.extrato.linkCommitments}
            </Link>
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <Link
              href={`/mapa-financeiro?year=${year}&month=${month}&view=lista`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {copy.extrato.linkMap}
            </Link>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-income/10 to-background/80 px-4 py-3.5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.extrato.totalIncome}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold", incomeClass())}>
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-expense/10 to-background/80 px-4 py-3.5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">
              {copy.extrato.totalExpense}
            </p>
            <p className={cn("mt-1 text-2xl font-semibold", expenseClass())}>
              {formatCurrency(totals.expense)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div
            role="tablist"
            aria-label={copy.extrato.originFilters}
            className="flex flex-wrap gap-1.5"
          >
            {ORIGIN_FILTERS.map((item) => {
              const active = origin === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setOrigin(item.id)}
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
          <div
            role="tablist"
            aria-label={copy.extrato.typeFilters}
            className="flex flex-wrap gap-1.5"
          >
            {TYPE_FILTERS.map((item) => {
              const active = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setType(item.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/70 shadow-sm backdrop-blur-sm">
          <div className="border-b border-border/50 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold tracking-tight">
              {copy.extrato.listTitle}
            </h3>
            <p className="text-xs text-muted-foreground">
              {copy.extrato.listCount(filtered.length)}
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
              {copy.extrato.empty}
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {tx.description || tx.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDateLabel(tx.date)}
                      {" · "}
                      {tx.recurringId
                        ? copy.extrato.badgeFixed
                        : copy.extrato.badgeOneOff}
                      {" · "}
                      {LEDGER_COLUMN_LABELS[tx.ledgerColumn]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        moneyClass,
                        tx.type === "INCOME" ? incomeClass() : expenseClass(),
                      )}
                    >
                      {tx.type === "INCOME" ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label={copy.daySheet.deleteEntry}
                      onClick={() => setPendingDeleteId(tx.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteId(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{copy.deleteConfirm.title}</DialogTitle>
            <DialogDescription>
              {seriesInfo && seriesInfo.count > 1
                ? seriesInfo.kind === "recurring"
                  ? copy.extrato.deleteSeriesHintFixed
                  : copy.extrato.deleteSeriesHint
                : copy.deleteConfirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={isDeleting}
            >
              {copy.deleteConfirm.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDelete("one")}
              disabled={isDeleting || !seriesInfo}
            >
              {isDeleting
                ? copy.deleteConfirm.deleting
                : copy.extrato.deleteOne}
            </Button>
            {seriesInfo && seriesInfo.count > 1 ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => confirmDelete("series")}
                disabled={isDeleting}
              >
                {isDeleting
                  ? copy.deleteConfirm.deleting
                  : copy.extrato.deleteSeries(seriesInfo.count)}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
