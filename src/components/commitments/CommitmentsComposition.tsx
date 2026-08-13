"use client";

import { useEffect, useMemo, useState } from "react";
import { moneyClass } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommitmentPieSlice } from "@/lib/commitment-map";
import { copy } from "@/lib/copy";

interface CommitmentsCompositionProps {
  slices: CommitmentPieSlice[];
  costOfLiving: number;
  monthKey: string;
}

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CommitmentsComposition({
  slices,
  costOfLiving,
  monthKey,
}: CommitmentsCompositionProps) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [monthKey, slices]);

  const segments = useMemo(() => {
    const total = slices.reduce((sum, s) => sum + s.amount, 0);
    if (total <= 0) return [];

    let offset = 0;
    return slices.map((slice) => {
      const pct = slice.amount / total;
      const length = pct * CIRCUMFERENCE;
      const segment = {
        ...slice,
        pct,
        dasharray: `${length} ${CIRCUMFERENCE - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return segment;
    });
  }, [slices]);

  if (slices.length === 0 || costOfLiving <= 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 bg-background/40 px-5 py-8 text-center text-sm text-muted-foreground">
        {copy.commitmentsMap.compositionEmpty}
      </div>
    );
  }

  return (
    <div
      key={monthKey}
      className="grid gap-6 rounded-3xl border border-border/60 bg-background/70 p-5 shadow-sm backdrop-blur-sm sm:grid-cols-[auto_1fr] sm:items-center sm:p-6"
    >
      <div className="relative mx-auto size-40">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-muted/60"
          />
          {segments.map((segment) => (
            <circle
              key={segment.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={segment.dasharray}
              strokeDashoffset={drawn ? segment.dashoffset : CIRCUMFERENCE}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
              style={{ opacity: segment.kind === "variable" ? 0.85 : 1 }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {copy.totals.costOfLiving}
          </p>
          <p className={cn("text-sm font-semibold", moneyClass)}>
            {formatCurrency(costOfLiving)}
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-muted-foreground">
                {segment.label}
                {segment.kind === "variable" ? (
                  <span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
                    est.
                  </span>
                ) : null}
              </span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {Math.round(segment.pct * 100)}%
              </span>
              <span className={cn("font-medium", moneyClass)}>
                {formatCurrency(segment.amount)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
