"use client";

import { useState, useTransition } from "react";
import {
  setAvailableBalanceAction,
  updateUserSettingsAction,
} from "@/app/actions/user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { copy } from "@/lib/copy";
import { appToast } from "@/lib/toast";
import type { UserSettingsDTO } from "@/types";

interface SettingsFormProps {
  settings: UserSettingsDTO;
  availableBalance: number;
}

export function SettingsForm({
  settings,
  availableBalance,
}: SettingsFormProps) {
  const [balance, setBalance] = useState(availableBalance);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const [balanceResult, cardResult] = await Promise.all([
        setAvailableBalanceAction({ amount: balance }),
        updateUserSettingsAction({
          cardClosingDay: Number(formData.get("cardClosingDay")),
          cardDueDay: Number(formData.get("cardDueDay")),
        }),
      ]);

      if (!balanceResult.success) {
        appToast.error(balanceResult.error ?? copy.toast.genericError);
        return;
      }
      if (!cardResult.success) {
        appToast.error(cardResult.error ?? copy.toast.genericError);
        return;
      }
      appToast.success(copy.settings.saved);
    });
  };

  return (
    <form action={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="availableBalance">{copy.settings.openingBalance}</Label>
        <MoneyInput
          id="availableBalance"
          value={balance}
          onValueChange={setBalance}
        />
        <p className="text-xs text-muted-foreground">
          {copy.settings.openingBalanceHint}
        </p>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">
          {copy.settings.cardSection}
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cardClosingDay">{copy.settings.cardClosingDay}</Label>
            <Input
              id="cardClosingDay"
              name="cardClosingDay"
              type="number"
              min={1}
              max={28}
              defaultValue={String(settings.cardClosingDay)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardDueDay">{copy.settings.cardDueDay}</Label>
            <Input
              id="cardDueDay"
              name="cardDueDay"
              type="number"
              min={1}
              max={28}
              defaultValue={String(settings.cardDueDay)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{copy.settings.cardHint}</p>
      </fieldset>
      <Button type="submit" disabled={isPending}>
        {copy.settings.save}
      </Button>
    </form>
  );
}
