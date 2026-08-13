"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteRecurringAction } from "@/app/actions/recurring";
import {
  deleteTransactionSeriesAction,
  fetchTransactionSeriesInfoAction,
} from "@/app/actions/transactions";
import { DayRegisterForm } from "@/components/commitments/DayRegisterForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CommitmentMapEvent } from "@/lib/commitment-map";
import { calendarEventsForDay } from "@/lib/day-items";
import { copy } from "@/lib/copy";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  MapaDaySnapshot,
  TransactionDTO,
} from "@/types";

type SeriesInfo = { count: number; kind: "recurring" | "orphan" | "single" };

type PendingDelete =
  | { kind: "transaction"; event: CommitmentMapEvent; txId: string }
  | {
      kind: "recurring";
      event: CommitmentMapEvent;
      ruleId: string;
      canDeleteOccurrence: boolean;
      occurrenceTxId: string | null;
    };

interface MapaDayStageProps {
  /** Desktop: always visible panel. Mobile sheet uses `sheetOpen`. */
  variant: "panel" | "sheet";
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
  date: string | null;
  today: string;
  daySnapshot: MapaDaySnapshot | null;
  planEvents: CommitmentMapEvent[];
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
  onChanged: () => void;
  onTransactionSaved: (tx: TransactionDTO) => void;
}

function splitRails(events: CommitmentMapEvent[]) {
  const cash: CommitmentMapEvent[] = [];
  const card: CommitmentMapEvent[] = [];
  for (const event of events) {
    if (event.payMode === "card" && !event.affectsCash) {
      card.push(event);
    } else if (event.affectsCash) {
      cash.push(event);
    }
  }
  return { cash, card };
}

function eventTxId(event: CommitmentMapEvent): string | null {
  if (event.id.startsWith("tx:")) return event.id.slice(3);
  return null;
}

function StageBody({
  date,
  today,
  daySnapshot,
  planEvents,
  transactions,
  categories,
  onChanged,
  onTransactionSaved,
  showDateTitle = true,
}: Omit<
  MapaDayStageProps,
  "variant" | "sheetOpen" | "onSheetOpenChange"
> & { date: string; showDateTitle?: boolean }) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const events = useMemo(
    () => calendarEventsForDay(planEvents, transactions, date, today),
    [planEvents, transactions, date, today],
  );
  const { cash, card } = useMemo(() => splitRails(events), [events]);

  const balance = daySnapshot?.balance ?? 0;
  const delta = daySnapshot?.cashNet ?? 0;
  const isPastOrToday = date <= today;
  const statusBadge = isPastOrToday
    ? copy.mapaFinanceiro.stageActual
    : copy.mapaFinanceiro.stagePlanned;

  useEffect(() => {
    if (!pendingDelete || pendingDelete.kind !== "transaction") {
      setSeriesInfo(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await fetchTransactionSeriesInfoAction(
        pendingDelete.txId,
      );
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
  }, [pendingDelete]);

  const openDelete = (event: CommitmentMapEvent) => {
    const txId = eventTxId(event);
    if (txId) {
      setPendingDelete({ kind: "transaction", event, txId });
      return;
    }
    // Plan recurring (future) or matched rule occurrence without tx: prefix
    const ruleId = event.ruleId;
    if (!ruleId) return;
    const matchedTx = transactions.find(
      (tx) =>
        tx.date === date &&
        tx.recurringId === ruleId &&
        tx.type === event.type,
    );
    setPendingDelete({
      kind: "recurring",
      event,
      ruleId,
      canDeleteOccurrence: Boolean(matchedTx) && date < today,
      occurrenceTxId: matchedTx?.id ?? null,
    });
  };

  const confirmDeleteTransaction = (scope: "one" | "series") => {
    if (!pendingDelete || pendingDelete.kind !== "transaction") return;
    const id = pendingDelete.txId;
    setPendingDelete(null);
    startDeleteTransition(async () => {
      const result = await deleteTransactionSeriesAction(id, scope);
      if (!result.success) {
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }
      appToast.success(
        copy.extrato.deleteSeriesDone(result.data?.deletedIds.length ?? 1),
      );
      onChanged();
    });
  };

  const confirmDeleteOccurrence = () => {
    if (!pendingDelete || pendingDelete.kind !== "recurring") return;
    if (!pendingDelete.occurrenceTxId) return;
    const id = pendingDelete.occurrenceTxId;
    setPendingDelete(null);
    startDeleteTransition(async () => {
      const result = await deleteTransactionSeriesAction(id, "one");
      if (!result.success) {
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }
      appToast.entryDeleted();
      onChanged();
    });
  };

  const confirmDeleteRecurring = () => {
    if (!pendingDelete || pendingDelete.kind !== "recurring") return;
    const ruleId = pendingDelete.ruleId;
    setPendingDelete(null);
    startDeleteTransition(async () => {
      const result = await deleteRecurringAction(ruleId);
      if (!result.success) {
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }
      appToast.fixedExpenseDeleted();
      onChanged();
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {showDateTitle ? (
            <p className="text-sm font-semibold tracking-tight">
              {formatDateLabel(date)}
            </p>
          ) : null}
          <Badge variant="secondary" className={showDateTitle ? "mt-1" : undefined}>
            {statusBadge}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setRegisterOpen(true)}>
          <Plus className="size-4" />
          {copy.mapaFinanceiro.stageRegister}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            {copy.mapaFinanceiro.stageBalance}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold tracking-tight",
              moneyClass,
              balanceClass(balance),
            )}
          >
            {formatCurrency(balance)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            {copy.mapaFinanceiro.stageDelta}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold tracking-tight",
              moneyClass,
              balanceClass(delta),
            )}
          >
            {delta > 0 ? "+" : ""}
            {formatCurrency(delta)}
          </p>
        </div>
      </div>

      <Rail
        title={copy.mapaFinanceiro.stageCashRail}
        empty={copy.mapaFinanceiro.stageCashEmpty}
        events={cash}
        onDelete={openDelete}
        isDeleting={isDeleting}
      />
      <Rail
        title={copy.mapaFinanceiro.stageCardRail}
        empty={copy.mapaFinanceiro.stageCardEmpty}
        events={card}
        onDelete={openDelete}
        isDeleting={isDeleting}
        cardTone
      />

      <DayRegisterForm
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        date={date}
        categories={categories}
        onSaved={(tx) => {
          onTransactionSaved(tx);
          onChanged();
        }}
      />

      <Dialog
        open={pendingDelete?.kind === "transaction"}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{copy.deleteConfirm.title}</DialogTitle>
            <DialogDescription>
              {seriesInfo && seriesInfo.count > 1
                ? seriesInfo.kind === "orphan"
                  ? copy.extrato.deleteSeriesHint
                  : copy.deleteConfirm.description
                : copy.deleteConfirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              {copy.deleteConfirm.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDeleteTransaction("one")}
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
                onClick={() => confirmDeleteTransaction("series")}
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

      <Dialog
        open={pendingDelete?.kind === "recurring"}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {pendingDelete?.kind === "recurring" &&
              pendingDelete.canDeleteOccurrence
                ? copy.horizon.deleteOccurrenceTitle
                : copy.horizon.deleteFixedTitle}
            </DialogTitle>
            <DialogDescription>
              {pendingDelete?.kind === "recurring" &&
              pendingDelete.canDeleteOccurrence
                ? copy.horizon.deleteOccurrenceDescription(
                    pendingDelete.event.label,
                  )
                : copy.horizon.deleteFixedDescription(
                    pendingDelete?.event.label ?? "",
                  )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={isDeleting}
            >
              {copy.deleteConfirm.cancel}
            </Button>
            {pendingDelete?.kind === "recurring" &&
            pendingDelete.canDeleteOccurrence ? (
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteOccurrence}
                disabled={isDeleting}
              >
                {isDeleting
                  ? copy.deleteConfirm.deleting
                  : copy.horizon.deleteOccurrenceOnly}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={
                pendingDelete?.kind === "recurring" &&
                pendingDelete.canDeleteOccurrence
                  ? "outline"
                  : "destructive"
              }
              className={
                pendingDelete?.kind === "recurring" &&
                pendingDelete.canDeleteOccurrence
                  ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                  : undefined
              }
              onClick={confirmDeleteRecurring}
              disabled={isDeleting}
            >
              {isDeleting
                ? copy.deleteConfirm.deleting
                : copy.horizon.deleteFixedConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Rail({
  title,
  empty,
  events,
  onDelete,
  isDeleting,
  cardTone,
}: {
  title: string;
  empty: string;
  events: CommitmentMapEvent[];
  onDelete: (event: CommitmentMapEvent) => void;
  isDeleting: boolean;
  cardTone?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-3.5 py-4 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const signed =
              event.type === "INCOME" ? event.amount : -event.amount;
            const canDelete =
              Boolean(eventTxId(event)) || Boolean(event.ruleId);
            return (
              <li
                key={event.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-2xl border px-3.5 py-3",
                  cardTone
                    ? "border-violet-500/25 bg-violet-500/[0.04]"
                    : "border-border/50",
                )}
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {event.payMode === "card" && event.affectsCash
                      ? copy.commitmentsMap.cardInvoicePayLabel
                      : event.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.payMode === "card" && !event.affectsCash
                      ? copy.commitmentsMap.legendPayCard
                      : event.payMode === "card" && event.affectsCash
                        ? copy.commitmentsMap.cardInvoicePayLabel
                        : copy.commitmentsMap.legendPayCash}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      moneyClass,
                      signed > 0
                        ? incomeClass()
                        : signed < 0
                          ? expenseClass()
                          : "text-muted-foreground",
                    )}
                  >
                    {signed > 0 ? "+" : signed < 0 ? "−" : ""}
                    {formatCurrency(Math.abs(signed))}
                  </span>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground"
                      aria-label={copy.daySheet.deleteEntry}
                      onClick={() => onDelete(event)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function MapaDayStage(props: MapaDayStageProps) {
  const {
    variant,
    sheetOpen = false,
    onSheetOpenChange,
    date,
    ...bodyProps
  } = props;

  if (variant === "sheet") {
    return (
      <Sheet open={sheetOpen && date != null} onOpenChange={onSheetOpenChange}>
        <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto p-6 sm:max-w-md">
          <SheetHeader className="p-0 pr-8">
            <SheetTitle>
              {date ? formatDateLabel(date) : copy.daySheet.titleFallback}
            </SheetTitle>
            <SheetDescription>
              {copy.mapaFinanceiro.daySheetDescription}
            </SheetDescription>
          </SheetHeader>
          {date ? (
            <div className="flex flex-col gap-5">
              <StageBody date={date} showDateTitle={false} {...bodyProps} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    );
  }

  if (!date) {
    return (
      <aside className="rounded-3xl border border-dashed border-border/60 bg-muted/20 p-5 text-sm text-muted-foreground">
        {copy.mapaFinanceiro.daySheetEmpty}
      </aside>
    );
  }

  return (
    <aside className="sticky top-4 space-y-5 rounded-3xl border border-border/50 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      <StageBody date={date} {...bodyProps} />
    </aside>
  );
}
