"use client";

import type { DatesSetArg, DayCellContentArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { format, subDays } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createTransactionAction,
  fetchVisibleRangeDataAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";
import { PeriodSummaryBar } from "@/components/calendar/PeriodSummaryBar";
import { EntryForm } from "@/components/entries/EntryForm";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryDTO, DailySummary } from "@/types";

interface FinanceCalendarProps {
  categories: CategoryDTO[];
  initialSummaries: DailySummary[];
}

type VisibleRange = {
  start: string;
  end: string;
};

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toVisibleRange(arg: DatesSetArg): VisibleRange {
  return {
    start: toDateKey(arg.start),
    end: toDateKey(subDays(arg.end, 1)),
  };
}

function rangeKey(range: VisibleRange): string {
  return `${range.start}_${range.end}`;
}

export function FinanceCalendar({
  categories,
  initialSummaries,
}: FinanceCalendarProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>(initialSummaries);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const skipInitialFetch = useRef(true);
  const visibleRangeRef = useRef<VisibleRange | null>(null);

  const summaryMap = useMemo(() => {
    return new Map(summaries.map((summary) => [summary.date, summary]));
  }, [summaries]);

  const applyRangeData = useCallback(
    (result: Awaited<ReturnType<typeof fetchVisibleRangeDataAction>>) => {
      startTransition(() => {
        if (result.success && result.data) {
          setSummaries(result.data.dailySummaries);
          setError(null);
        } else {
          setError(result.error ?? copy.calendar.loadError);
        }
      });
    },
    [],
  );

  const reloadVisibleRange = useCallback(async () => {
    const range = visibleRangeRef.current;
    if (!range) {
      return;
    }

    setIsLoading(true);
    const result = await fetchVisibleRangeDataAction(range.start, range.end);
    applyRangeData(result);
    setIsLoading(false);
  }, [applyRangeData]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const nextRange = toVisibleRange(arg);
    visibleRangeRef.current = nextRange;

    setVisibleRange((current) => {
      if (current && rangeKey(current) === rangeKey(nextRange)) {
        return current;
      }
      return nextRange;
    });
  }, []);

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      const result = await fetchVisibleRangeDataAction(
        visibleRange.start,
        visibleRange.end,
      );

      if (cancelled) {
        return;
      }

      applyRangeData(result);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleRange, applyRangeData]);

  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSheetOpen(true);
  };

  const handleSavedFromHeader = () => {
    void reloadVisibleRange();
    setEntryOpen(false);
  };

  const showLoading = isLoading || isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {copy.calendarTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{copy.calendarSubtitle}</p>
        </div>
        <Button
          data-testid="new-entry-button"
          onClick={() => {
            setEntryDate(format(new Date(), "yyyy-MM-dd"));
            setEntryOpen(true);
          }}
        >
          <Plus className="size-4" />
          {copy.calendar.newEntry}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PeriodSummaryBar summaries={summaries} />

      <div className="relative">
        {showLoading && (
          <div
            data-testid="calendar-loading-overlay"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]"
          >
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div
          className={cn(
            "finance-calendar rounded-xl border bg-card p-3 shadow-sm transition-opacity",
            showLoading && "pointer-events-none opacity-60",
          )}
        >
          <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          locale={ptBrLocale}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          height="auto"
          fixedWeekCount={false}
          dateClick={(info) => openDay(info.dateStr)}
          datesSet={handleDatesSet}
          dayCellContent={(arg: DayCellContentArg) => {
            const key = toDateKey(arg.date);
            const summary = summaryMap.get(key);

            return (
              <div className="flex h-full flex-col gap-1 p-1">
                <div className="text-right text-xs font-medium">
                  {arg.dayNumberText}
                </div>
                {summary && (
                  <div className="space-y-0.5 text-[10px] leading-tight sm:text-xs">
                    {summary.incomeTotal > 0 && (
                      <div className="font-medium text-emerald-600">
                        +{formatCurrency(summary.incomeTotal)}
                      </div>
                    )}
                    {summary.expenseTotal > 0 && (
                      <div className="font-medium text-red-600">
                        -{formatCurrency(summary.expenseTotal)}
                      </div>
                    )}
                    {(summary.incomeTotal > 0 || summary.expenseTotal > 0) && (
                      <div className="text-muted-foreground">
                        = {formatCurrency(summary.net)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }}
        />
        </div>
      </div>

      <DayDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        categories={categories}
        onChanged={() => void reloadVisibleRange()}
      />

      <EntryForm
        open={entryOpen}
        onOpenChange={setEntryOpen}
        date={entryDate}
        categories={categories}
        onSaved={() => handleSavedFromHeader()}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
      />
    </div>
  );
}
