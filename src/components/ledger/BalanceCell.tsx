import { balanceHeatmapClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceCellProps {
  value: number;
  lowThreshold?: number;
  className?: string;
}

export function BalanceCell({
  value,
  lowThreshold,
  className,
}: BalanceCellProps) {
  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right text-sm",
        balanceHeatmapClass(value, lowThreshold),
        className,
      )}
    >
      {formatCurrency(value)}
    </td>
  );
}
