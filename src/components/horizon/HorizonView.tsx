"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { fetchHorizonAction } from "@/app/actions/horizon";
import { SetAvailableBalanceDialog } from "@/components/cash/SetAvailableBalanceDialog";
import { HorizonCoach } from "@/components/horizon/HorizonCoach";
import { HorizonDaySheet } from "@/components/horizon/HorizonDaySheet";
import { HorizonGrid } from "@/components/horizon/HorizonGrid";
import { HorizonLegend } from "@/components/horizon/HorizonLegend";
import { HorizonSummaryCards } from "@/components/horizon/HorizonSummary";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { CategoryDTO, HorizonData, HorizonDayCell } from "@/types";

const HORIZON_MONTHS = 12;
const ESTIMATE_STORAGE_KEY = "horizon-include-variable-estimate";

const estimateListeners = new Set<() => void>();

function subscribeEstimatePreference(onStoreChange: () => void) {
  estimateListeners.add(onStoreChange);
  return () => {
    estimateListeners.delete(onStoreChange);
  };
}

function getEstimatePreferenceSnapshot() {
  return window.localStorage.getItem(ESTIMATE_STORAGE_KEY) !== "0";
}

function getEstimatePreferenceServerSnapshot() {
  return true;
}

function writeEstimatePreference(next: boolean) {
  window.localStorage.setItem(ESTIMATE_STORAGE_KEY, next ? "1" : "0");
  for (const listener of estimateListeners) listener();
}

interface HorizonViewProps {
  initialData: HorizonData;
  categories: CategoryDTO[];
}

function findCell(
  data: HorizonData,
  date: string | null,
): HorizonDayCell | null {
  if (!date) return null;
  for (const month of data.months) {
    const match = month.days.find((day) => day.date === date);
    if (match) return match;
  }
  return null;
}

export function HorizonView({ initialData, categories }: HorizonViewProps) {
  const [data, setData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const includeEstimate = useSyncExternalStore(
    subscribeEstimatePreference,
    getEstimatePreferenceSnapshot,
    getEstimatePreferenceServerSnapshot,
  );
  const selectedCell = findCell(data, selectedDate);

  const loadHorizon = (withEstimate: boolean) => {
    startRefresh(async () => {
      const result = await fetchHorizonAction(
        data.today,
        HORIZON_MONTHS,
        withEstimate,
      );
      if (result.success && result.data) {
        setData(result.data);
      }
    });
  };

  useEffect(() => {
    if (!includeEstimate) {
      loadHorizon(false);
    }
    // Hydrate once when local preference differs from SSR default (on).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToToday = () => {
    const dayNum = Number(data.today.split("-")[2]);
    const [year, month] = data.today.split("-").map(Number);

    document
      .getElementById(`horizon-day-${dayNum}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

    document
      .getElementById(`horizon-month-${year}-${month}`)
      ?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
  };

  const refreshHorizon = () => {
    loadHorizon(includeEstimate);
  };

  const setEstimateEnabled = (next: boolean) => {
    if (next === includeEstimate) return;
    writeEstimatePreference(next);
    loadHorizon(next);
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/50",
        "bg-gradient-to-br from-primary/[0.07] via-background to-expense/[0.05]",
        "shadow-[0_20px_50px_-28px_rgba(15,40,35,0.35)]",
        "animate-in fade-in duration-500",
        isRefreshing && "opacity-90",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-64 rounded-full bg-expense/10 blur-3xl"
      />

      <div className="relative space-y-6 p-4 sm:p-6 lg:p-7">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {copy.horizon.eyebrow}
            </p>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {copy.horizon.title}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {copy.horizon.subtitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {copy.horizon.months12Hint}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              role="group"
              aria-label={copy.horizon.estimateToggle}
              title={copy.horizon.estimateToggleHint}
              className="inline-flex rounded-xl border border-border/60 bg-background/70 p-1 shadow-sm"
            >
              {(
                [
                  { value: true, label: copy.horizon.estimateOn },
                  { value: false, label: copy.horizon.estimateOff },
                ] as const
              ).map((option) => {
                const active = includeEstimate === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={active}
                    disabled={isRefreshing}
                    onClick={() => setEstimateEnabled(option.value)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:text-sm",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={scrollToToday}
            >
              {copy.horizon.goToday}
            </Button>
          </div>
        </header>

        <HorizonSummaryCards
          summary={data.summary}
          onEditAvailableBalance={() => setBalanceOpen(true)}
        />
        <HorizonCoach summary={data.summary} />
        <HorizonLegend showEstimate={includeEstimate} />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold tracking-tight">
            {copy.horizon.gridTitle}
          </h3>
          <HorizonGrid
            data={data}
            onSelectDay={(cell) => setSelectedDate(cell.date)}
          />
        </div>
      </div>

      <HorizonDaySheet
        open={selectedDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
        cell={selectedCell}
        categories={categories}
        onChanged={refreshHorizon}
      />

      <SetAvailableBalanceDialog
        open={balanceOpen}
        onOpenChange={setBalanceOpen}
        currentAmount={data.summary.currentBalance}
        asOfDate={data.today}
        onSaved={() => refreshHorizon()}
      />
    </section>
  );
}
