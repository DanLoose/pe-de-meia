"use client";

import { useMemo, useState, useTransition } from "react";
import { createTransactionAction } from "@/app/actions/transactions";
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
import { formatSlashDate } from "@/lib/format";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  LedgerColumn,
  TransactionDTO,
  TransactionType,
} from "@/types";

type PayMode = "cash" | "card";

interface DayRegisterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  onSaved: (transaction: TransactionDTO) => void;
}

export function DayRegisterForm({
  open,
  onOpenChange,
  date,
  categories,
  onSaved,
}: DayRegisterFormProps) {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [payMode, setPayMode] = useState<PayMode>("cash");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryId = useMemo(() => {
    const match = categories.find((c) => c.type === type);
    return match?.id ?? "";
  }, [categories, type]);

  const reset = () => {
    setType("EXPENSE");
    setAmount(0);
    setDescription("");
    setPayMode("cash");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!date) return;
    setError(null);

    if (amount <= 0 || !description.trim()) {
      setError(copy.dayRegister.saveError);
      return;
    }
    if (!categoryId) {
      setError(
        type === "INCOME"
          ? copy.dayRegister.missingIncomeCategory
          : copy.dayRegister.missingCategory,
      );
      return;
    }

    const ledgerColumn: LedgerColumn =
      type === "INCOME" ? "INCOME" : payMode === "cash" ? "DAILY" : "CARD";

    startTransition(async () => {
      const result = await createTransactionAction({
        type,
        amount,
        description: description.trim(),
        date,
        categoryId,
        ledgerColumn,
        recurring: false,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? copy.dayRegister.saveError);
        appToast.error(result.error ?? copy.dayRegister.saveError);
        return;
      }

      appToast.entryCreated();
      onSaved(result.data);
      handleOpenChange(false);
    });
  };

  const isIncome = type === "INCOME";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.dayRegister.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isIncome
              ? copy.dayRegister.subtitleIncome
              : copy.dayRegister.subtitle}
            {date ? ` · ${formatSlashDate(date)}` : null}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.entry.type}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["INCOME", "EXPENSE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setType(option);
                    if (option === "INCOME") setPayMode("cash");
                  }}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    type === option
                      ? option === "INCOME"
                        ? "border-income/40 bg-income/10 text-income"
                        : "border-expense/40 bg-expense/10 text-expense"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {option === "INCOME"
                    ? copy.entry.income
                    : copy.entry.expense}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day-reg-amount">{copy.dayRegister.amount}</Label>
            <MoneyInput
              id="day-reg-amount"
              value={amount}
              onValueChange={setAmount}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="day-reg-what">{copy.dayRegister.what}</Label>
            <Input
              id="day-reg-what"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isIncome
                  ? copy.dayRegister.whatPlaceholderIncome
                  : copy.dayRegister.whatPlaceholder
              }
              autoFocus
            />
          </div>

          {!isIncome ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{copy.dayRegister.howPaid}</p>
              <div className="grid gap-2">
                <PayOption
                  active={payMode === "cash"}
                  title={copy.dayRegister.payCash}
                  hint={copy.dayRegister.payCashHint}
                  onClick={() => setPayMode("cash")}
                />
                <PayOption
                  active={payMode === "card"}
                  title={copy.dayRegister.payCard}
                  hint={copy.dayRegister.payCardHint}
                  onClick={() => setPayMode("card")}
                />
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "rounded-xl border px-3 py-2.5 text-sm",
              isIncome
                ? "border-income/25 bg-income/10 text-foreground"
                : payMode === "cash"
                  ? "border-expense/25 bg-expense/10 text-foreground"
                  : "border-amber-300/50 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
            )}
          >
            {isIncome
              ? copy.dayRegister.effectIncome
              : payMode === "cash"
                ? copy.dayRegister.effectCash
                : copy.dayRegister.effectCard}
          </div>

          {error ? <p className="text-sm text-expense">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {copy.entry.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isPending || amount <= 0 || !description.trim() || !categoryId
            }
          >
            {copy.dayRegister.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayOption({
  active,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3.5 py-3 text-left transition-all",
        active
          ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20"
          : "border-border/70 hover:border-border hover:bg-muted/40",
      )}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}
