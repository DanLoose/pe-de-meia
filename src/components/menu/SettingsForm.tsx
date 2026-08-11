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
        dailyDivisor: Number(formData.get("dailyDivisor")),
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
          defaultValue={settings.openingBalance}
        />
        <p className="text-xs text-muted-foreground">
          {copy.settings.openingBalanceHint}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dailyDivisor">{copy.settings.dailyDivisor}</Label>
        <Input
          id="dailyDivisor"
          name="dailyDivisor"
          type="number"
          min={1}
          max={31}
          defaultValue={settings.dailyDivisor}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {copy.settings.save}
      </Button>
    </form>
  );
}
