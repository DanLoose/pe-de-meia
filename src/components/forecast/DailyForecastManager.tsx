"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  deleteFixedExpenseAction,
  upsertFixedExpenseAction,
} from "@/app/actions/fixed-expenses";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { copy } from "@/lib/copy";
import { expenseClass, moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { DailyForecastData, FixedExpenseDTO } from "@/types";

interface DailyForecastManagerProps {
  initialData: DailyForecastData;
  onTotalChange?: (total: number) => void;
}

export function DailyForecastManager({
  initialData,
  onTotalChange,
}: DailyForecastManagerProps) {
  const [data, setData] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpenseDTO | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const commitData = (next: DailyForecastData) => {
    setData(next);
    onTotalChange?.(next.totalFixed);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setAmount(0);
    setFormOpen(true);
  };

  const openEdit = (expense: FixedExpenseDTO) => {
    setEditing(expense);
    setName(expense.name);
    setAmount(expense.amount);
    setFormOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertFixedExpenseAction({
        id: editing?.id,
        name,
        amount,
      });
      if (!result.success || !result.data) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      const exists = data.expenses.some((e) => e.id === result.data!.id);
      const expenses = exists
        ? data.expenses.map((e) =>
            e.id === result.data!.id ? result.data! : e,
          )
        : [...data.expenses, result.data!];
      const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
      commitData({
        ...data,
        expenses,
        totalFixed,
        dailyCeiling: totalFixed,
      });
      setFormOpen(false);
      appToast.success(copy.dailyBudget.saved);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteFixedExpenseAction(id);
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      const expenses = data.expenses.filter((e) => e.id !== id);
      const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
      commitData({
        ...data,
        expenses,
        totalFixed,
        dailyCeiling: totalFixed,
      });
      appToast.success(copy.dailyBudget.deleted);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl">
          <h3 className="text-sm font-semibold tracking-tight">
            {copy.dailyBudget.monthlyExpenses}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.dailyBudget.intro}
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="rounded-full shadow-sm">
          <Plus className="size-4" />
          {copy.dailyBudget.addExpense}
        </Button>
      </div>

      <div
        className={cn(
          "rounded-3xl border border-border/60 bg-gradient-to-br from-expense/[0.06] to-background px-4 py-4",
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">
          {copy.dailyBudget.dailyCeiling}
        </p>
        <p className={cn("mt-1 text-3xl font-semibold tracking-tight", expenseClass())}>
          {formatCurrency(data.totalFixed)}
        </p>
      </div>

      {data.expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {copy.dailyBudget.empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {data.expenses.map((expense) => (
            <li key={expense.id}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-expense/15 bg-gradient-to-r from-expense/[0.07] to-background px-3 py-3 transition-all sm:px-4",
                  "hover:-translate-y-0.5 hover:shadow-md",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-expense/15 text-xs font-semibold text-expense">
                  ≈
                </div>
                <p className="min-w-0 flex-1 truncate font-medium">
                  {expense.name}
                </p>
                <p className={cn("shrink-0 text-base font-semibold", moneyClass)}>
                  {formatCurrency(expense.amount)}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    aria-label={copy.dailyBudget.edit}
                    onClick={() => openEdit(expense)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-expense"
                    aria-label={copy.dailyBudget.delete}
                    onClick={() => handleDelete(expense.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? copy.dailyBudget.editExpense
                : copy.dailyBudget.newExpense}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">{copy.dailyBudget.name}</Label>
              <Input
                id="expense-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.dailyBudget.examples}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">{copy.dailyBudget.amount}</Label>
              <MoneyInput
                id="expense-amount"
                value={amount}
                onValueChange={setAmount}
              />
              <p className="text-xs text-muted-foreground">
                {copy.dailyBudget.amountHint}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {copy.entry.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !name.trim() || amount <= 0}
            >
              {editing ? copy.entry.update : copy.entry.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
