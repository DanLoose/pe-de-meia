"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  deleteFixedExpenseAction,
  updateDailyDivisorAction,
  upsertFixedExpenseAction,
} from "@/app/actions/fixed-expenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";
import type { DailyForecastData, FixedExpenseDTO } from "@/types";

interface DailyForecastManagerProps {
  initialData: DailyForecastData;
}

const DIVISOR_OPTIONS = [28, 30, 31];

export function DailyForecastManager({ initialData }: DailyForecastManagerProps) {
  const [data, setData] = useState(initialData);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpenseDTO | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const openCreate = () => {
    setEditing(null);
    setName("");
    setAmount("");
    setFormOpen(true);
  };

  const openEdit = (expense: FixedExpenseDTO) => {
    setEditing(expense);
    setName(expense.name);
    setAmount(String(expense.amount));
    setFormOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertFixedExpenseAction({
        id: editing?.id,
        name,
        amount: Number(amount),
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
          dailyCeiling: totalFixed / current.dailyDivisor,
        };
      });
      setFormOpen(false);
      appToast.success(copy.forecast.saved);
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
          dailyCeiling: totalFixed / current.dailyDivisor,
        };
      });
      appToast.success(copy.forecast.deleted);
    });
  };

  const handleDivisorChange = (value: string) => {
    const dailyDivisor = Number(value);
    startTransition(async () => {
      const result = await updateDailyDivisorAction(dailyDivisor);
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      setData((current) => ({
        ...current,
        dailyDivisor,
        dailyCeiling: current.totalFixed / dailyDivisor,
      }));
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>{copy.forecast.dailyCeiling}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums text-primary">
            {formatCurrency(data.dailyCeiling)}/dia
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(data.totalFixed)} ÷ {data.dailyDivisor} dias
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>{copy.forecast.divisorDays}</Label>
          <Select
            value={String(data.dailyDivisor)}
            onValueChange={(value) => {
              if (value) handleDivisorChange(value);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <span>{data.dailyDivisor} dias</span>
            </SelectTrigger>
            <SelectContent>
              {DIVISOR_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {copy.forecast.addExpense}
        </Button>
      </div>

      <div className="space-y-2">
        {data.expenses.length === 0 && (
          <p className="text-sm text-muted-foreground">{copy.forecast.empty}</p>
        )}
        {data.expenses.map((expense) => (
          <div
            key={expense.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <p className="font-medium">{expense.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(expense.amount)}/mês
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.forecast.edit}
                onClick={() => openEdit(expense)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.forecast.delete}
                onClick={() => handleDelete(expense.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? copy.forecast.editExpense : copy.forecast.newExpense}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">{copy.forecast.name}</Label>
              <Input
                id="expense-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">{copy.forecast.amount}</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {copy.entry.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {editing ? copy.entry.update : copy.entry.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
