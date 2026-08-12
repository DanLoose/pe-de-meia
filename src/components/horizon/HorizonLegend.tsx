import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const items = [
  {
    label: copy.horizon.legendNegative,
    className: "bg-expense/15 text-expense",
  },
  {
    label: copy.horizon.legendLow,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    label: copy.horizon.legendHealthy,
    className: "text-income",
  },
  {
    label: copy.horizon.legendProjected,
    className: "border border-dashed border-border bg-background text-foreground",
  },
  {
    label: copy.horizon.legendRecurring,
    dot: true,
  },
] as const;

export function HorizonLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{copy.horizon.legendTitle}</span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {"dot" in item ? (
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          ) : (
            <span
              className={cn(
                "inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 font-medium tabular-nums",
                item.className,
              )}
            >
              ·
            </span>
          )}
          {item.label}
        </span>
      ))}
    </div>
  );
}
