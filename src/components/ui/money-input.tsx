"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  amountToDigits,
  digitsToAmount,
  formatAmountInput,
} from "@/lib/money-input";
import { cn } from "@/lib/utils";

interface MoneyInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "value" | "onChange" | "inputMode" | "defaultValue"
  > {
  value: number;
  onValueChange: (value: number) => void;
}

function MoneyInput({
  value,
  onValueChange,
  className,
  ...props
}: MoneyInputProps) {
  const digits = amountToDigits(value);
  const display = formatAmountInput(digitsToAmount(digits));

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onFocus={(event) => {
        event.target.select();
        props.onFocus?.(event);
      }}
      onChange={(event) => {
        const nextDigits = event.target.value.replace(/\D/g, "").slice(0, 14);
        onValueChange(digitsToAmount(nextDigits));
      }}
      className={cn("tabular-nums", className)}
    />
  );
}

export { MoneyInput };
