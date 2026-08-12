import { ledgerCellClass } from "@/components/ledger/LedgerCells";
import { ledgerBalanceClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceCellProps {
  value: number;
  lowThreshold?: number;
  muted?: boolean;
  className?: string;
  header?: boolean;
}

export function BalanceCell({
  value,
  lowThreshold,
  muted,
  className,
  header,
}: BalanceCellProps) {
  return (
    <td
      className={cn(
        ledgerCellClass,
        "cursor-default px-2.5 py-1.5 text-right text-sm",
        ledgerBalanceClass(value, lowThreshold, { muted }),
        !muted && value !== 0 && "font-semibold",
        header && "font-medium",
        className,
      )}
    >
      {formatCurrency(value)}
    </td>
  );
}
