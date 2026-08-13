"use client";

import { useEffect, useState, useTransition } from "react";
import { setAvailableBalanceAction } from "@/app/actions/user-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";

interface SetAvailableBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Balance currently shown in the UI (e.g. Projeção “Saldo hoje”). */
  currentAmount: number;
  asOfDate: string;
  onSaved: (amount: number) => void;
}

export function SetAvailableBalanceDialog({
  open,
  onOpenChange,
  currentAmount,
  asOfDate,
  onSaved,
}: SetAvailableBalanceDialogProps) {
  const [amount, setAmount] = useState(currentAmount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setAmount(currentAmount);
  }, [open, currentAmount]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await setAvailableBalanceAction({ amount, asOfDate });
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      appToast.success(copy.cashBalance.saved);
      onOpenChange(false);
      onSaved(amount);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.cashBalance.title}</DialogTitle>
          <DialogDescription>{copy.cashBalance.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {copy.cashBalance.currentLabel}:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(currentAmount)}
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="available-balance">{copy.cashBalance.amountLabel}</Label>
            <MoneyInput
              id="available-balance"
              value={amount}
              onValueChange={setAmount}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {copy.cashBalance.hint}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {copy.deleteConfirm.cancel}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? copy.cashBalance.saving : copy.cashBalance.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
