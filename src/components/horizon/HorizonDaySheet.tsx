"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
import { copy } from "@/lib/copy";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { LEDGER_COLUMN_LABELS } from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoryDTO, HorizonDayCell, HorizonDayMovement } from "@/types";

type SeriesInfo = { count: number; kind: "recurring" | "orphan" | "single" };

type PendingDelete =
  | { kind: "transaction"; movement: HorizonDayMovement }
  | {
      kind: "recurring";
      movement: HorizonDayMovement;
      ruleId: string;
      /** Past materialized occurrence: can delete this day without killing the rule. */
      canDeleteOccurrence: boolean;
    };

function isProjectedRecurring(item: HorizonDayMovement) {
  return item.source === "recurring" && item.id.startsWith("rule:");
}

interface HorizonDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cell: HorizonDayCell | null;
  categories: CategoryDTO[];
  onChanged: () => void;
}

function sourceLabel(item: HorizonDayMovement) {
  if (item.source === "recurring") return copy.horizon.daySheetFixed;
  if (item.source === "estimate") return copy.horizon.daySheetEstimate;
  return copy.horizon.daySheetOneOff;
}

export function HorizonDaySheet({
  open,
  onOpenChange,
  cell,
  categories,
  onChanged,
}: HorizonDaySheetProps) {
  const movements = cell?.movements ?? [];
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!pendingDelete || pendingDelete.kind !== "transaction") {
      setSeriesInfo(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await fetchTransactionSeriesInfoAction(
        pendingDelete.movement.id,
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

  const confirmDeleteTransaction = (scope: "one" | "series") => {
    if (!pendingDelete || pendingDelete.kind !== "transaction") return;
    const id = pendingDelete.movement.id;
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
    if (!pendingDelete.canDeleteOccurrence) return;
    const id = pendingDelete.movement.id;
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

  const openDelete = (item: HorizonDayMovement) => {
    if (item.source === "estimate") return;
    if (item.source === "recurring") {
      const ruleId = item.ruleId ?? item.id.replace(/^rule:/, "").split(":")[0];
      if (!ruleId) return;
      setPendingDelete({
        kind: "recurring",
        movement: item,
        ruleId,
        canDeleteOccurrence: Boolean(cell?.isPast) && !isProjectedRecurring(item),
      });
      return;
    }
    setPendingDelete({ kind: "transaction", movement: item });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-5 p-6 sm:max-w-md">
          <SheetHeader className="p-0 pr-8">
            <SheetTitle>
              {cell ? formatDateLabel(cell.date) : copy.daySheet.titleFallback}
            </SheetTitle>
            <SheetDescription>
              {copy.horizon.daySheetDescription}
              {cell ? (
                <span className="mt-1 block text-xs">
                  {cell.isProjected
                    ? copy.horizon.daySheetProjected
                    : copy.horizon.daySheetActual}
                </span>
              ) : null}
            </SheetDescription>
          </SheetHeader>

          {cell ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {copy.horizon.daySheetBalance}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xl font-semibold tracking-tight",
                      moneyClass,
                      balanceClass(cell.balance),
                    )}
                  >
                    {formatCurrency(cell.balance)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {copy.horizon.daySheetDelta}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xl font-semibold tracking-tight",
                      moneyClass,
                      balanceClass(cell.delta),
                    )}
                  >
                    {cell.delta > 0 ? "+" : ""}
                    {formatCurrency(cell.delta)}
                  </p>
                </div>
              </div>

              <section className="flex min-h-0 flex-1 flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-tight">
                    {copy.horizon.daySheetMovements}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setRegisterOpen(true)}
                    disabled={!cell.date}
                  >
                    <Plus className="size-4" />
                    {copy.mapaFinanceiro.daySheetAdd}
                  </Button>
                </div>

                {movements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {copy.horizon.daySheetEmpty}
                    </p>
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => setRegisterOpen(true)}
                    >
                      <Plus className="size-4" />
                      {copy.mapaFinanceiro.daySheetAdd}
                    </Button>
                  </div>
                ) : (
                  <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    {movements.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-start justify-between gap-2 rounded-2xl border px-3.5 py-3",
                          item.source === "estimate" &&
                            "border-dashed border-expense/40 bg-expense/5",
                          item.source === "recurring" &&
                            "border-primary/25 bg-primary/[0.04]",
                          item.source === "transaction" && "border-border/50",
                        )}
                      >
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                item.source === "recurring"
                                  ? "default"
                                  : item.source === "estimate"
                                    ? "outline"
                                    : "secondary"
                              }
                              className={cn(
                                item.source === "estimate" &&
                                  "border-dashed border-expense/50 text-expense",
                              )}
                            >
                              {sourceLabel(item)}
                            </Badge>
                            {item.source !== "estimate" ? (
                              <span className="text-xs text-muted-foreground">
                                {LEDGER_COLUMN_LABELS[item.ledgerColumn]}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-sm font-medium">
                            {item.label}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              moneyClass,
                              item.type === "INCOME" || item.cashDelta > 0
                                ? incomeClass()
                                : expenseClass(),
                            )}
                          >
                            {item.cashDelta > 0 ? "+" : ""}
                            {formatCurrency(item.cashDelta)}
                          </span>
                          {item.source === "estimate" ? null : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground"
                              aria-label={copy.daySheet.deleteEntry}
                              onClick={() => openDelete(item)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <Link
                  href="/gastos-fixos"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {copy.horizon.daySheetOpenCommitments}
                </Link>
                <Link
                  href="/extrato"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {copy.extrato.seeExtrato}
                </Link>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <DayRegisterForm
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        date={cell?.date ?? null}
        categories={categories}
        onSaved={() => {
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
                    pendingDelete.movement.label,
                  )
                : copy.horizon.deleteFixedDescription(
                    pendingDelete?.movement.label ?? "",
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
