"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteTransactionAction } from "@/app/actions/transactions";
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
import { copy } from "@/lib/copy";
import {
  dayItemAmount,
  dayItemLabel,
  dayItemType,
  mergeDayItems,
  type MergedDayItem,
} from "@/lib/day-items";
import { balanceClass, expenseClass, incomeClass, moneyClass } from "@/lib/design";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { LEDGER_COLUMN_LABELS } from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types";

interface MapaDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  planEvents: CommitmentMapEvent[];
  transactions: TransactionDTO[];
  onAdd: () => void;
  onDeleted: (id: string) => void;
}

function statusLabel(item: MergedDayItem) {
  if (item.kind === "extra") return copy.mapaFinanceiro.daySheetExtra;
  return item.status === "done"
    ? copy.mapaFinanceiro.daySheetPaid
    : copy.mapaFinanceiro.daySheetPending;
}

export function MapaDaySheet({
  open,
  onOpenChange,
  date,
  planEvents,
  transactions,
  onAdd,
  onDeleted,
}: MapaDaySheetProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const dayTxs = useMemo(
    () => (date ? transactions.filter((tx) => tx.date === date) : []),
    [transactions, date],
  );

  const items = useMemo(
    () => mergeDayItems(planEvents, dayTxs),
    [planEvents, dayTxs],
  );

  const net = useMemo(
    () =>
      dayTxs.reduce((sum, tx) => {
        if (tx.type === "INCOME") return sum + tx.amount;
        return sum - tx.amount;
      }, 0),
    [dayTxs],
  );

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);

    startDeleteTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (!result.success) {
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }
      appToast.entryDeleted();
      onDeleted(id);
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-5 p-6 sm:max-w-md">
          <SheetHeader className="p-0 pr-8">
            <SheetTitle>
              {date ? formatDateLabel(date) : copy.daySheet.titleFallback}
            </SheetTitle>
            <SheetDescription>
              {copy.mapaFinanceiro.daySheetDescription}
            </SheetDescription>
          </SheetHeader>

          {dayTxs.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3">
              <p className="text-xs font-medium text-muted-foreground">
                {copy.mapaFinanceiro.daySheetNet}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-2xl font-semibold tracking-tight",
                  moneyClass,
                  balanceClass(net),
                )}
              >
                {formatCurrency(net)}
              </p>
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                {copy.mapaFinanceiro.daySheetItems}
              </h3>
              <Button size="sm" onClick={onAdd} disabled={!date}>
                <Plus className="size-4" />
                {copy.mapaFinanceiro.daySheetAdd}
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {copy.mapaFinanceiro.daySheetEmpty}
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={onAdd}
                  disabled={!date}
                >
                  <Plus className="size-4" />
                  {copy.mapaFinanceiro.daySheetAdd}
                </Button>
              </div>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {items.map((item) => {
                  const type = dayItemType(item);
                  const { transaction: tx } = item;
                  const pending =
                    item.kind === "plan" && item.status === "pending";
                  const key =
                    item.kind === "plan" ? item.event.id : item.transaction.id;

                  return (
                    <li
                      key={key}
                      className={cn(
                        "flex items-start justify-between gap-2 rounded-2xl border px-3.5 py-3",
                        pending
                          ? "border-dashed border-border/70 bg-muted/20"
                          : "border-border/50",
                      )}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {!pending ? (
                            <Check
                              className="size-3.5 shrink-0 text-primary"
                              aria-hidden
                            />
                          ) : null}
                          <p className="truncate text-sm font-medium">
                            {dayItemLabel(item)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {statusLabel(item)}
                          {tx
                            ? ` · ${LEDGER_COLUMN_LABELS[tx.ledgerColumn]}`
                            : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            moneyClass,
                            type === "INCOME"
                              ? incomeClass()
                              : expenseClass(),
                          )}
                        >
                          {type === "INCOME" ? "+" : "−"}
                          {formatCurrency(dayItemAmount(item))}
                        </span>
                        {tx ? (
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
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </SheetContent>
      </Sheet>

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
              {copy.deleteConfirm.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? copy.deleteConfirm.deleting
                : copy.deleteConfirm.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
