"use client";

import { Lock } from "lucide-react";
import { useMemo } from "react";
import { copy } from "@/lib/copy";
import {
  buildCycleRibbonSegments,
  type CycleRibbonPhase,
} from "@/lib/mapa-snapshot";
import { cn } from "@/lib/utils";

interface MapaCycleRibbonProps {
  year: number;
  month: number;
  closingDay: number;
  dueDay: number;
  /** Pad empty cells so ribbon aligns with Sunday-start grid. */
  startPad: number;
}

const PHASE_CLASS: Record<CycleRibbonPhase, string> = {
  open: "bg-violet-500/55",
  close: "bg-slate-600",
  closed: "bg-slate-400/70 dark:bg-slate-500/60",
  pay: "bg-amber-500",
};

const PHASE_LABEL: Record<CycleRibbonPhase, string> = {
  open: copy.mapaFinanceiro.cycleOpen,
  close: copy.mapaFinanceiro.cycleClose,
  closed: copy.mapaFinanceiro.cycleClosed,
  pay: copy.mapaFinanceiro.cyclePay,
};

export function MapaCycleRibbon({
  year,
  month,
  closingDay,
  dueDay,
  startPad,
}: MapaCycleRibbonProps) {
  const segments = useMemo(
    () => buildCycleRibbonSegments(year, month, closingDay, dueDay),
    [year, month, closingDay, dueDay],
  );

  const lastDay = segments[segments.length - 1]?.endDay ?? 0;
  if (lastDay < 1) return null;

  // 7-column grid: pad + days, then trailing empty cells to fill last week.
  const totalCells = startPad + lastDay;
  const trailing = (7 - (totalCells % 7)) % 7;

  return (
    <div
      className="space-y-1.5"
      role="img"
      aria-label={copy.mapaFinanceiro.cycleRibbonLabel}
    >
      <div
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
        style={{ gridAutoRows: "0.45rem" }}
      >
        {Array.from({ length: startPad }, (_, i) => (
          <div key={`pad-${i}`} aria-hidden />
        ))}
        {segments.map((seg) => {
          const span = seg.endDay - seg.startDay + 1;
          const mid = Math.floor((seg.startDay + seg.endDay) / 2);
          return (
            <div
              key={`${seg.phase}-${seg.startDay}`}
              className={cn(
                "relative h-full min-h-[0.45rem] rounded-full",
                PHASE_CLASS[seg.phase],
                seg.phase === "close" && "flex items-center justify-center",
              )}
              style={{ gridColumn: `span ${span}` }}
              title={`${PHASE_LABEL[seg.phase]} · dias ${seg.startDay}–${seg.endDay}`}
            >
              {seg.phase === "close" ? (
                <Lock
                  className="absolute inset-0 m-auto size-2.5 text-white"
                  aria-hidden
                />
              ) : null}
              {seg.phase === "pay" && span === 1 ? (
                <span className="sr-only">
                  {copy.commitmentsMap.cardInvoicePayLabel} {mid}
                </span>
              ) : null}
            </div>
          );
        })}
        {Array.from({ length: trailing }, (_, i) => (
          <div key={`trail-${i}`} aria-hidden />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {(
          [
            ["open", copy.mapaFinanceiro.cycleOpen],
            ["close", copy.mapaFinanceiro.cycleClose],
            ["closed", copy.mapaFinanceiro.cycleClosed],
            ["pay", copy.mapaFinanceiro.cyclePay],
          ] as const
        ).map(([phase, label]) => (
          <span key={phase} className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", PHASE_CLASS[phase])}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
