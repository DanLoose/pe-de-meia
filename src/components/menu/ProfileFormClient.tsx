"use client";

import { useTransition } from "react";
import { updateUserSettingsAction } from "@/app/actions/user-settings";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/copy";
import { appToast } from "@/lib/toast";
import type { UserSettingsDTO } from "@/types";

interface ProfileFormClientProps {
  settings: UserSettingsDTO;
}

export function ProfileFormClient({ settings }: ProfileFormClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUserSettingsAction({
        name: String(formData.get("name") ?? ""),
      });
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return;
      }
      appToast.success(copy.profile.saved);
    });
  };

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader title={copy.profile.title} description={copy.profile.subtitle} />
      <form action={handleSubmit} className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{copy.profile.name}</Label>
          <Input id="name" name="name" defaultValue={settings.name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{copy.profile.email}</Label>
          <Input id="email" value={settings.email} disabled />
        </div>
        <Button type="submit" disabled={isPending}>
          {copy.profile.save}
        </Button>
      </form>
    </div>
  );
}
