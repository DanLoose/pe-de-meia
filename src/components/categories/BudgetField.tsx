"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copy } from "@/lib/copy";

interface BudgetFieldProps {
  categoryId: string;
  savedAmount?: number;
  onSave: (categoryId: string, amount: string) => void;
  disabled?: boolean;
}

export function BudgetField({
  categoryId,
  savedAmount,
  onSave,
  disabled,
}: BudgetFieldProps) {
  const [value, setValue] = useState(savedAmount ? String(savedAmount) : "");
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const parsed = Number(value);
  const canSave = value.trim() !== "" && !Number.isNaN(parsed) && parsed > 0;

  const handleSave = () => {
    if (!canSave) {
      return;
    }

    startTransition(() => {
      onSave(categoryId, value);
      setDirty(false);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`budget-${categoryId}`} className="sr-only">
        {copy.categories.budget}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          id={`budget-${categoryId}`}
          data-testid={`budget-input-${categoryId}`}
          type="number"
          min="0.01"
          step="0.01"
          className="w-32 pl-10"
          placeholder={copy.categories.budgetPlaceholder}
          value={value}
          disabled={disabled || isPending}
          onChange={(event) => {
            setValue(event.target.value);
            setDirty(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }
          }}
        />
      </div>
      {(dirty || isPending) && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-testid={`budget-save-${categoryId}`}
          disabled={isPending || !canSave}
          onClick={handleSave}
          aria-label={copy.categories.saveBudget}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Check className="size-4" />
              <span className="hidden sm:inline">{copy.categories.saveBudget}</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
