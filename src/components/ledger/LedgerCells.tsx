import { ArrowDown, ArrowUp, Plus } from "lucide-react";
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
  { className: string; hoverClassName: string; letter?: string }
> = {
  income: {
    className: "bg-income text-white",
    hoverClassName: "group-hover:bg-income group-hover:text-white",
  },
  expense: {
    className: "bg-expense text-white",
    hoverClassName: "group-hover:bg-expense group-hover:text-white",
  },
  daily: {
    className: "bg-fuchsia-500 text-white",
    hoverClassName: "group-hover:bg-fuchsia-500 group-hover:text-white",
    letter: "D",
  },
  savings: {
    className: "bg-lime-500 text-white",
    hoverClassName: "group-hover:bg-lime-500 group-hover:text-white",
    letter: "E",
  },
  card: {
    className: "bg-violet-500 text-white",
    hoverClassName: "group-hover:bg-violet-500 group-hover:text-white",
    letter: "C",
  },
};

export function ColumnGlyph({
  variant,
  muted = false,
  plusOnHover = false,
}: {
  variant: LedgerMovementVariant;
  muted?: boolean;
  plusOnHover?: boolean;
}) {
  const style = glyphStyles[variant];

  return (
    <span
      className={cn(
        "relative inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
        muted
          ? "bg-muted-foreground/20 text-muted-foreground/70"
          : style.className,
        plusOnHover && style.hoverClassName,
      )}
      aria-hidden
    >
      <span className={cn(plusOnHover && "group-hover:opacity-0")}>
        {variant === "income" ? (
          <ArrowDown className="size-3" />
        ) : variant === "expense" ? (
          <ArrowUp className="size-3" />
        ) : (
          style.letter
        )}
      </span>
      {plusOnHover ? (
        <Plus className="pointer-events-none absolute size-3 opacity-0 group-hover:opacity-100" />
      ) : null}
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
  onAdd?: () => void;
  selected?: boolean;
}

const viewLabelByVariant: Record<LedgerMovementVariant, string> = {
  income: copy.ledger.viewIncome,
  expense: copy.ledger.viewExpense,
  daily: copy.ledger.viewDaily,
  savings: copy.ledger.viewSavings,
  card: copy.ledger.viewCard,
};

const addLabelByVariant: Record<LedgerMovementVariant, string> = {
  income: copy.ledger.addIncome,
  expense: copy.ledger.addExpense,
  daily: copy.ledger.addDaily,
  savings: copy.ledger.addSavings,
  card: copy.ledger.addCard,
};

export function MovementCell({
  value,
  variant,
  date,
  onClick,
  onAdd,
  selected,
}: MovementCellProps) {
  const isEmpty = value === 0;

  return (
    <td
      className={cn(
        ledgerCellClass,
        selected && "bg-primary/10 ring-1 ring-inset ring-primary/40",
      )}
    >
      <div className="group flex h-full min-h-8 w-full items-stretch hover:bg-muted/50">
        {onAdd ? (
          <button
            type="button"
            data-testid={`ledger-add-${date}-${variant}`}
            aria-label={addLabelByVariant[variant]}
            className="flex shrink-0 cursor-pointer items-center pl-2.5"
            onClick={onAdd}
          >
            <ColumnGlyph variant={variant} muted={isEmpty} plusOnHover />
          </button>
        ) : (
          <span className="flex items-center pl-2.5">
            <ColumnGlyph variant={variant} muted={isEmpty} />
          </span>
        )}
        {onClick ? (
          <button
            type="button"
            data-testid={`ledger-cell-${date}-${variant}`}
            aria-label={viewLabelByVariant[variant]}
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-end py-1 pr-2.5"
            onClick={onClick}
          >
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
          </button>
        ) : (
          <div
            data-testid={`ledger-cell-${date}-${variant}`}
            className="flex min-w-0 flex-1 items-center justify-end py-1 pr-2.5"
          >
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
          </div>
        )}
      </div>
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
