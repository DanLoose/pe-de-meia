"use client";

import { useTransition } from "react";
import { updateUserSettingsAction } from "@/app/actions/user-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/copy";
import { appToast } from "@/lib/toast";
import type { UserSettingsDTO } from "@/types";

interface SettingsFormProps {
  settings: UserSettingsDTO;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUserSettingsAction({
        openingBalance: Number(formData.get("openingBalance")),
        cardClosingDay: Number(formData.get("cardClosingDay")),
        cardDueDay: Number(formData.get("cardDueDay")),
      });
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      appToast.success(copy.settings.saved);
    });
  };

  return (
    <form action={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="openingBalance">{copy.settings.openingBalance}</Label>
        <Input
          id="openingBalance"
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={String(settings.openingBalance)}
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
