import { ledgerBalanceClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceCellProps {
  value: number;
  lowThreshold?: number;
  muted?: boolean;
  className?: string;
}

export function BalanceCell({
  value,
  lowThreshold,
  muted,
  className,
}: BalanceCellProps) {
  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right text-sm",
        ledgerBalanceClass(value, lowThreshold, { muted }),
        !muted && value !== 0 && "font-semibold",
        className,
      )}
    >
      {formatCurrency(value)}
    </td>
  );
}
