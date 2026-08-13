import { ArrowDown, ArrowUp } from "lucide-react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface HorizonLegendProps {
  showEstimate?: boolean;
}

export function HorizonLegend({ showEstimate = true }: HorizonLegendProps) {
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
      className:
        "border border-dashed border-border bg-background text-foreground",
    },
    {
      label: copy.horizon.legendInflow,
      arrow: "up" as const,
    },
    {
      label: copy.horizon.legendOutflow,
      arrow: "down" as const,
    },
    ...(showEstimate
      ? [
          {
            label: copy.horizon.legendEstimate,
            className:
              "border border-dashed border-expense/40 bg-expense/5 text-expense",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border border-border/50 bg-background/70 px-4 py-3 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
      <span className="font-medium text-foreground">
        {copy.horizon.legendTitle}
      </span>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          {"arrow" in item ? (
            item.arrow === "up" ? (
              <ArrowUp
                className="size-3 text-income"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <ArrowDown
                className="size-3 text-expense"
                strokeWidth={2.5}
                aria-hidden
              />
            )
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
