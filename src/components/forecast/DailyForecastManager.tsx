"use client";

import { EllipsisVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";
import type { DailyForecastData, FixedExpenseDTO } from "@/types";

interface DailyForecastManagerProps {
  initialData: DailyForecastData;
}

export function DailyForecastManager({ initialData }: DailyForecastManagerProps) {
  const [data, setData] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpenseDTO | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [isPending, startTransition] = useTransition();

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
      setData((current) => {
        const exists = current.expenses.some((e) => e.id === result.data!.id);
        const expenses = exists
          ? current.expenses.map((e) =>
              e.id === result.data!.id ? result.data! : e,
            )
          : [...current.expenses, result.data!];
        const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
        return {
          ...current,
          expenses,
          totalFixed,
          dailyCeiling: totalFixed,
        };
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
      setData((current) => {
        const expenses = current.expenses.filter((e) => e.id !== id);
        const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);
        return {
          ...current,
          expenses,
          totalFixed,
          dailyCeiling: totalFixed,
        };
      });
      appToast.success(copy.dailyBudget.deleted);
    });
  };

  return (
    <div className="w-full space-y-6">
      <p className="text-sm text-muted-foreground">{copy.dailyBudget.intro}</p>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium lowercase text-muted-foreground">
          {copy.dailyBudget.monthlyExpenses}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={copy.dailyBudget.addExpense}
          onClick={openCreate}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {data.expenses.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {copy.dailyBudget.empty}
          </p>
        ) : (
          <div className="divide-y">
            {data.expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <p className="min-w-0 flex-1 truncate">{expense.name}</p>
                <p className="shrink-0 tabular-nums">
                  {formatCurrency(expense.amount)}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={copy.dailyBudget.rowMenu}
                      />
                    }
                  >
                    <EllipsisVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(expense)}>
                      <Pencil />
                      {copy.dailyBudget.edit}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(expense.id)}
                      disabled={isPending}
                    >
                      <Trash2 />
                      {copy.dailyBudget.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end border-t pt-4">
        <div className="text-right">
          <p className="text-xs lowercase text-muted-foreground">
            {copy.dailyBudget.dailyCeiling}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(data.totalFixed)}
          </p>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? copy.dailyBudget.editExpense : copy.dailyBudget.newExpense}
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
