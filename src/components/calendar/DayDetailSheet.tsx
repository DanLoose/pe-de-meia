"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import {
  createTransactionAction,
  deleteTransactionAction,
  fetchDayTransactionsAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { EntryForm } from "@/components/entries/EntryForm";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { copy } from "@/lib/copy";
import { balanceClass, expenseClass, incomeClass } from "@/lib/design";
import { formatCurrency, formatDateLabel } from "@/lib/format";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoryDTO, TransactionDTO } from "@/types";

interface DayDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  onChanged: () => void;
}

export function DayDetailSheet({
  open,
  onOpenChange,
  date,
  categories,
  onChanged,
}: DayDetailSheetProps) {
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isLoading = Boolean(open && date && loadedDate !== date);

  useEffect(() => {
    if (!open || !date) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await fetchDayTransactionsAction(date);
      if (cancelled) {
        return;
      }

      if (result.success && result.data) {
        setTransactions(result.data);
        setLoadedDate(date);
        setError(null);
      } else {
        setError(result.error ?? copy.daySheet.loadError);
        setLoadedDate(date);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, date]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === "INCOME") {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        acc.net = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, net: 0 },
    );
  }, [transactions]);

  const confirmDelete = () => {
    if (!pendingDeleteId) {
      return;
    }

    const id = pendingDeleteId;
    const previous = transactions;
    setTransactions((current) => current.filter((item) => item.id !== id));
    setPendingDeleteId(null);

    startDeleteTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (!result.success) {
        setTransactions(previous);
        setError(result.error ?? copy.daySheet.deleteError);
        appToast.error(result.error ?? copy.daySheet.deleteError);
        return;
      }

      setError(null);
      appToast.entryDeleted();
      onChanged();
    });
  };

  const handleSaved = (transaction: TransactionDTO) => {
    const isUpdate = transactions.some((item) => item.id === transaction.id);

    setTransactions((current) => {
      const exists = current.some((item) => item.id === transaction.id);
      if (exists) {
        return current.map((item) =>
          item.id === transaction.id ? transaction : item,
        );
      }
      return [...current, transaction].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    });
    setFormOpen(false);
    setEditing(null);
    if (isUpdate) {
      appToast.entryUpdated();
    } else {
      appToast.entryCreated();
    }
    onChanged();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-5 p-6 sm:max-w-md">
          <SheetHeader className="p-0 pr-8">
            <SheetTitle>
              {date ? formatDateLabel(date) : copy.daySheet.titleFallback}
            </SheetTitle>
            <SheetDescription>{copy.daySheet.description}</SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{copy.daySheet.income}</p>
              <p className={cn("font-medium", incomeClass())}>
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{copy.daySheet.expense}</p>
              <p className={cn("font-medium", expenseClass())}>
                {formatCurrency(totals.expense)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">{copy.daySheet.net}</p>
              <p className={cn("font-medium", balanceClass(totals.net))}>
                {formatCurrency(totals.net)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium">{copy.daySheet.entries}</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              disabled={!date}
            >
              <Plus className="size-4" />
              {copy.daySheet.addEntry}
            </Button>
          </div>

          <Separator />

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {isLoading && transactions.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {copy.daySheet.loading}
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!isLoading && transactions.length === 0 && !error && (
              <EmptyState
                icon={Wallet}
                title={copy.empty.dayTitle}
                description={copy.empty.dayDescription}
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                    disabled={!date}
                  >
                    <Plus className="size-4" />
                    {copy.daySheet.addEntry}
                  </Button>
                }
              />
            )}
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                data-testid={`entry-row-${transaction.id}`}
                role="button"
                tabIndex={0}
                className="flex min-h-11 cursor-pointer items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                onClick={() => {
                  setEditing(transaction);
                  setFormOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setEditing(transaction);
                    setFormOpen(true);
                  }
                }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{ borderColor: transaction.categoryColor }}
                    >
                      {transaction.categoryName}
                    </Badge>
                    <span
                      className={
                        transaction.type === "INCOME"
                          ? incomeClass()
                          : expenseClass()
                      }
                    >
                      {transaction.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                  {transaction.description && (
                    <p className="text-sm text-muted-foreground">
                      {transaction.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={copy.daySheet.editEntry}
                    onClick={() => {
                      setEditing(transaction);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={copy.daySheet.deleteEntry}
                    onClick={() => setPendingDeleteId(transaction.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingDeleteId(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{copy.deleteConfirm.title}</DialogTitle>
            <DialogDescription>{copy.deleteConfirm.description}</DialogDescription>
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
              data-testid="confirm-delete-entry"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? copy.deleteConfirm.deleting : copy.deleteConfirm.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        date={date}
        categories={categories}
        transaction={editing}
        onSaved={handleSaved}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
        showSuccessToast={false}
      />
    </>
  );
}
