"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import {
  defaultTypeForLedgerColumn,
  LEDGER_COLUMN_LABELS,
} from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  LedgerColumn,
  TransactionDTO,
  TransactionType,
} from "@/types";

type TypeFilter = "ALL" | TransactionType;

interface LedgerDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  onChanged: () => void;
  onNavigate: (date: string) => void;
  monthDates: string[];
  ledgerColumn?: LedgerColumn | null;
}

export function LedgerDaySheet({
  open,
  onOpenChange,
  date,
  categories,
  onChanged,
  onNavigate,
  monthDates,
  ledgerColumn = null,
}: LedgerDaySheetProps) {
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isColumnScoped = Boolean(ledgerColumn);
  const isLoading = Boolean(open && date && loadedDate !== date);
  const columnLabel = ledgerColumn
    ? LEDGER_COLUMN_LABELS[ledgerColumn]
    : null;
  const createDefaultType = ledgerColumn
    ? defaultTypeForLedgerColumn(ledgerColumn)
    : undefined;
  const columnIsPositive =
    ledgerColumn === "INCOME" || ledgerColumn === "SAVINGS";

  useEffect(() => {
    if (!open || !date) return;

    let cancelled = false;

    void (async () => {
      const result = await fetchDayTransactionsAction(date);
      if (cancelled) return;

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

  const filtered = useMemo(() => {
    let next = transactions;
    if (ledgerColumn) {
      next = next.filter((tx) => tx.ledgerColumn === ledgerColumn);
    } else if (typeFilter !== "ALL") {
      next = next.filter((tx) => tx.type === typeFilter);
    }
    return next;
  }, [transactions, typeFilter, ledgerColumn]);

  const totals = useMemo(() => {
    if (ledgerColumn) {
      const total = filtered.reduce((sum, tx) => sum + tx.amount, 0);
      return { income: 0, expense: 0, net: 0, column: total };
    }

    return filtered.reduce(
      (acc, transaction) => {
        if (transaction.type === "INCOME") {
          acc.income += transaction.amount;
        } else {
          acc.expense += transaction.amount;
        }
        acc.net = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, net: 0, column: 0 },
    );
  }, [filtered, ledgerColumn]);

  const dateIndex = date ? monthDates.indexOf(date) : -1;
  const canGoPrev = dateIndex > 0;
  const canGoNext = dateIndex >= 0 && dateIndex < monthDates.length - 1;

  const navigateDay = (delta: number) => {
    if (dateIndex < 0) return;
    const nextDate = monthDates[dateIndex + delta];
    if (nextDate) {
      setLoadedDate(null);
      onNavigate(nextDate);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;

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
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTypeFilter("ALL");
          onOpenChange(nextOpen);
        }}
      >
        <SheetContent className="flex w-full flex-col gap-5 p-6 sm:max-w-md">
          <SheetHeader className="p-0 pr-8">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.ledger.prevDay}
                disabled={!canGoPrev}
                onClick={() => navigateDay(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="text-center">
                <SheetTitle>
                  {columnLabel
                    ? columnLabel
                    : date
                      ? formatDateLabel(date)
                      : copy.daySheet.titleFallback}
                </SheetTitle>
                <SheetDescription>
                  {isColumnScoped
                    ? date
                      ? `${formatDateLabel(date)} · ${copy.daySheet.columnDescription}`
                      : copy.daySheet.columnDescription
                    : copy.daySheet.description}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.ledger.nextDay}
                disabled={!canGoNext}
                onClick={() => navigateDay(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          {isColumnScoped ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">{copy.daySheet.columnTotal}</p>
              <p
                className={cn(
                  "font-medium",
                  columnIsPositive ? incomeClass() : expenseClass(),
                )}
              >
                {formatCurrency(totals.column)}
              </p>
            </div>
          ) : (
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
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {!isColumnScoped ? (
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as TypeFilter)}
              >
                <SelectTrigger
                  className="w-[160px]"
                  aria-label={copy.ledger.filterType}
                >
                  <span>{copy.ledger.filterType}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{copy.ledger.filterAll}</SelectItem>
                  <SelectItem value="INCOME">{copy.entry.income}</SelectItem>
                  <SelectItem value="EXPENSE">{copy.entry.expense}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div />
            )}
            <Button size="sm" onClick={openCreateForm} disabled={!date}>
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
            {!isLoading && filtered.length === 0 && !error && (
              <EmptyState
                icon={Wallet}
                title={copy.empty.dayTitle}
                description={copy.empty.dayDescription}
                action={
                  <Button size="sm" onClick={openCreateForm} disabled={!date}>
                    <Plus className="size-4" />
                    {copy.daySheet.addEntry}
                  </Button>
                }
              />
            )}
            {filtered.map((transaction) => (
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
          if (!nextOpen) setPendingDeleteId(null);
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
              data-testid="confirm-delete-entry"
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

      <EntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        date={date}
        categories={categories}
        transaction={editing}
        defaultType={editing ? undefined : createDefaultType}
        lockType={isColumnScoped && !editing}
        ledgerColumn={ledgerColumn ?? undefined}
        onSaved={handleSaved}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
        showSuccessToast={false}
      />
    </>
  );
}
