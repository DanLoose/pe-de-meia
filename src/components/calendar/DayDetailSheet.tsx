"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createTransactionAction,
  deleteTransactionAction,
  fetchDayTransactionsAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { EntryForm } from "@/components/entries/EntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDateLabel } from "@/lib/format";
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !date) return;

    startTransition(async () => {
      const result = await fetchDayTransactionsAction(date);
      if (result.success && result.data) {
        setTransactions(result.data);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load transactions");
      }
    });
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

  const handleDelete = (id: string) => {
    const previous = transactions;
    setTransactions((current) => current.filter((item) => item.id !== id));

    startTransition(async () => {
      const result = await deleteTransactionAction(id);
      if (!result.success) {
        setTransactions(previous);
        setError(result.error ?? "Failed to delete transaction");
        return;
      }
      setError(null);
      onChanged();
    });
  };

  const handleSaved = (transaction: TransactionDTO) => {
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
    onChanged();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{date ? formatDateLabel(date) : "Day details"}</SheetTitle>
            <SheetDescription>
              Review and manage entries for this day.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Income</p>
              <p className="font-medium text-emerald-600">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Expense</p>
              <p className="font-medium text-red-600">
                {formatCurrency(totals.expense)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground">Net</p>
              <p className="font-medium">{formatCurrency(totals.net)}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <h3 className="font-medium">Entries</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              disabled={!date}
            >
              <Plus className="size-4" />
              Add entry
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {isPending && transactions.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading entries...</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!isPending && transactions.length === 0 && !error && (
              <p className="text-sm text-muted-foreground">
                No entries yet for this day.
              </p>
            )}
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                data-testid={`entry-row-${transaction.id}`}
                className="flex items-start justify-between rounded-lg border p-3"
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
                          ? "text-emerald-600"
                          : "text-red-600"
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
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit entry"
                    onClick={() => {
                      setEditing(transaction);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete entry"
                    onClick={() => handleDelete(transaction.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <EntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        date={date}
        categories={categories}
        transaction={editing}
        onSaved={handleSaved}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
      />
    </>
  );
}
