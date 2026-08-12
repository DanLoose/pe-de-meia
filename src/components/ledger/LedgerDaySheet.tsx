"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  ListFilter,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import {
  createTransactionAction,
  deleteTransactionAction,
  fetchDayTransactionsAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { EntryForm } from "@/components/entries/EntryForm";
import { ColumnGlyph } from "@/components/ledger/LedgerCells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { copy } from "@/lib/copy";
import { balanceClass, expenseClass, incomeClass } from "@/lib/design";
import {
  formatCompactDateLabel,
  formatCurrency,
  formatDateLabel,
  formatNumericDateLabel,
} from "@/lib/format";
import {
  defaultTypeForLedgerColumn,
  LEDGER_COLUMN_LABELS,
  LEDGER_COLUMNS,
  cardEntryKindLabel,
  ledgerColumnHint,
  ledgerColumnVariant,
} from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoryDTO, LedgerColumn, TransactionDTO } from "@/types";

interface LedgerDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  onChanged: () => void;
  onNavigate: (date: string) => void;
  monthDates: string[];
  ledgerColumn?: LedgerColumn | null;
  onColumnChange?: (column: LedgerColumn | null) => void;
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
  onColumnChange,
}: LedgerDaySheetProps) {
  const [transactions, setTransactions] = useState<TransactionDTO[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isColumnScoped = Boolean(ledgerColumn);
  const isLoading = Boolean(open && date && loadedDate !== date);
  const createDefaultType = ledgerColumn
    ? defaultTypeForLedgerColumn(ledgerColumn)
    : undefined;

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
    if (!ledgerColumn) return transactions;
    return transactions.filter((tx) => tx.ledgerColumn === ledgerColumn);
  }, [transactions, ledgerColumn]);

  const totals = useMemo(() => {
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
      { income: 0, expense: 0, net: 0 },
    );
  }, [filtered]);

  const handleColumnChange = (value: string | null) => {
    if (!value) return;
    setFormOpen(false);
    setEditing(null);
    onColumnChange?.(value === "ALL" ? null : (value as LedgerColumn));
  };

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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          showCloseButton={false}
          className="flex w-full flex-col gap-5 p-6 sm:max-w-md"
        >
          <SheetHeader className="p-0">
            <div className="flex items-center gap-1">
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={copy.daySheet.close}
                  />
                }
              >
                <X className="size-4" />
              </SheetClose>
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.ledger.prevDay}
                  disabled={!canGoPrev}
                  onClick={() => navigateDay(-1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="min-w-0 text-center">
                  <SheetTitle className="text-sm whitespace-nowrap">
                    {date ? formatCompactDateLabel(date) : copy.daySheet.titleFallback}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    {date ? formatDateLabel(date) : copy.daySheet.description}
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
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.daySheet.addEntry}
                onClick={openCreateForm}
                disabled={!date}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </SheetHeader>

          {!isColumnScoped && (
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

          <Select
            value={ledgerColumn ?? "ALL"}
            onValueChange={handleColumnChange}
          >
            <SelectTrigger
              className="h-10 w-full rounded-full px-3"
              aria-label={copy.ledger.filterColumn}
              data-testid="ledger-column-filter"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ListFilter className="size-4 text-muted-foreground" />
                {ledgerColumn ? (
                  <ColumnGlyph variant={ledgerColumnVariant(ledgerColumn)} />
                ) : null}
                <span className="truncate lowercase">
                  {ledgerColumn
                    ? LEDGER_COLUMN_LABELS[ledgerColumn]
                    : copy.ledger.filterAll}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{copy.ledger.filterAll}</SelectItem>
              {LEDGER_COLUMNS.map((column) => (
                <SelectItem key={column} value={column}>
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <ColumnGlyph variant={ledgerColumnVariant(column)} />
                      {LEDGER_COLUMN_LABELS[column]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ledgerColumnHint(column)}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {ledgerColumn ? (
            <p className="text-xs text-muted-foreground">
              {ledgerColumnHint(ledgerColumn)}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
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
            <div className="divide-y">
              {filtered.map((transaction) => {
                const variant = ledgerColumnVariant(transaction.ledgerColumn);
                const title =
                  transaction.description?.trim() || transaction.categoryName;

                return (
                  <div
                    key={transaction.id}
                    data-testid={`entry-row-${transaction.id}`}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center gap-3 py-3 transition-colors hover:bg-muted/40"
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
                    <ColumnGlyph variant={variant} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-medium">{title}</p>
                        {transaction.ledgerColumn === "CARD" ? (
                          <Badge
                            variant="outline"
                            className="h-5 shrink-0 lowercase"
                          >
                            {cardEntryKindLabel(transaction.affectsBalance)}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatNumericDateLabel(transaction.date)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium tabular-nums">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground lowercase">
                        {LEDGER_COLUMN_LABELS[transaction.ledgerColumn]}
                      </p>
                    </div>
                    <div onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={copy.daySheet.rowMenu}
                            />
                          }
                        >
                          <EllipsisVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(transaction);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            {copy.daySheet.editEntry}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDeleteId(transaction.id)}
                          >
                            <Trash2 />
                            {copy.daySheet.deleteEntry}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
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
