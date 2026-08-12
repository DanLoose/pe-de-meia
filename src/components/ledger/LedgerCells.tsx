import { ArrowDown, ArrowUp } from "lucide-react";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LedgerMovementVariant =
  | "income"
  | "expense"
  | "daily"
  | "savings"
  | "card";

export const ledgerCellClass =
  "border-b border-r border-border p-0 align-middle text-sm";

const glyphStyles: Record<
  LedgerMovementVariant,
  { className: string; letter?: string }
> = {
  income: { className: "bg-income text-white" },
  expense: { className: "bg-expense text-white" },
  daily: { className: "bg-fuchsia-500 text-white", letter: "D" },
  savings: { className: "bg-lime-500 text-white", letter: "E" },
  card: { className: "bg-violet-500 text-white", letter: "C" },
};

export function ColumnGlyph({
  variant,
  muted = false,
}: {
  variant: LedgerMovementVariant;
  muted?: boolean;
}) {
  const style = glyphStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        muted ? "bg-muted-foreground/20 text-muted-foreground/70" : style.className,
      )}
      aria-hidden
    >
      {variant === "income" ? (
        <ArrowDown className="size-3" />
      ) : variant === "expense" ? (
        <ArrowUp className="size-3" />
      ) : (
        style.letter
      )}
    </span>
  );
}

export function MovementCellContent({
  value,
  variant,
  compact,
}: {
  value: number;
  variant: LedgerMovementVariant;
  compact?: boolean;
}) {
  const isEmpty = value === 0;

  return (
    <span
      className={cn(
        "inline-flex w-full items-center justify-between gap-2",
        compact ? "min-h-8 px-2.5 py-1.5" : "min-h-8 px-2.5 py-1",
      )}
    >
      <ColumnGlyph variant={variant} muted={isEmpty} />
      <span
        className={cn(
          "min-w-0 truncate tabular-nums",
          isEmpty
            ? "text-muted-foreground/35"
            : variant === "income" || variant === "savings"
              ? "font-medium text-income"
              : "font-medium text-expense",
        )}
      >
        {isEmpty ? "—" : formatCurrency(value)}
      </span>
    </span>
  );
}

interface MovementCellProps {
  value: number;
  variant: LedgerMovementVariant;
  date: string;
  onClick?: () => void;
  selected?: boolean;
}

export function MovementCell({
  value,
  variant,
  date,
  onClick,
  selected,
}: MovementCellProps) {
  const interactive = Boolean(onClick);
  const labelByVariant: Record<LedgerMovementVariant, string> = {
    income: copy.ledger.viewIncome,
    expense: copy.ledger.viewExpense,
    daily: copy.ledger.viewDaily,
    savings: copy.ledger.viewSavings,
    card: copy.ledger.viewCard,
  };
  const label = labelByVariant[variant];

  const content = <MovementCellContent value={value} variant={variant} />;

  return (
    <td
      className={cn(
        ledgerCellClass,
        selected && "bg-primary/10 ring-1 ring-inset ring-primary/40",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
    >
      {interactive ? (
        <button
          type="button"
          data-testid={`ledger-cell-${date}-${variant}`}
          aria-label={label}
          className="group flex h-full w-full cursor-pointer hover:bg-muted/50"
          onClick={onClick}
        >
          {content}
        </button>
      ) : (
        <div
          data-testid={`ledger-cell-${date}-${variant}`}
          className="cursor-default"
        >
          {content}
        </div>
      )}
    </td>
  );
}

interface DayCellProps {
  date: string;
  day: number;
  isToday: boolean;
  hasActivity: boolean;
  onClick: () => void;
}

export function DayCell({
  date,
  day,
  isToday,
  hasActivity,
  onClick,
}: DayCellProps) {
  return (
    <td className={cn(ledgerCellClass, "cursor-pointer border-l")}>
      <button
        type="button"
        data-testid={`ledger-cell-${date}-day`}
        aria-label={`${copy.ledger.openDay} ${String(day).padStart(2, "0")}`}
        className={cn(
          "flex h-full min-h-8 w-full cursor-pointer items-center gap-2 px-2.5 py-1 text-left tabular-nums hover:bg-muted/50",
          hasActivity || isToday
            ? "font-semibold text-foreground"
            : "font-normal text-muted-foreground/55",
          isToday && "text-primary",
        )}
        onClick={onClick}
      >
        {hasActivity && (
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        )}
        {String(day).padStart(2, "0")}
      </button>
    </td>
  );
}
