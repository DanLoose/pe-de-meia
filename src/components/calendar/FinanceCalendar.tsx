"use client";

import type { DatesSetArg, DayCellContentArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { format, subDays } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  createTransactionAction,
  fetchVisibleRangeDataAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";
import { PeriodSummaryBar } from "@/components/calendar/PeriodSummaryBar";
import { EntryForm } from "@/components/entries/EntryForm";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/lib/copy";
import { balanceClass } from "@/lib/design";
import { formatCurrency, formatShortDateLabel } from "@/lib/format";
import { dismissCalendarHint, isCalendarHintDismissed, subscribeCalendarHint } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import type { BudgetSummary, CategoryDTO, DailySummary } from "@/types";

interface FinanceCalendarProps {
  categories: CategoryDTO[];
  initialSummaries: DailySummary[];
  initialBudgetSummary?: BudgetSummary | null;
  today: string;
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
  initialBudgetSummary = null,
  today,
}: FinanceCalendarProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>(initialSummaries);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(
    initialBudgetSummary,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(today);
  const [visibleRange, setVisibleRange] = useState<VisibleRange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showHint = useSyncExternalStore(
    subscribeCalendarHint,
    () => !isCalendarHintDismissed(),
    () => false,
  );
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
          setBudgetSummary(result.data.budgetSummary ?? null);
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

  const entryTargetDate = selectedDate ?? today;
  const entryDateLabel =
    entryTargetDate === today
      ? copy.calendar.today
      : formatShortDateLabel(entryTargetDate);

  const openNewEntry = (date?: string) => {
    setEntryDate(date ?? entryTargetDate);
    setEntryOpen(true);
  };

  const showLoading = isLoading || isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.calendarTitle}
        description={copy.calendarSubtitle}
        action={
          <Button
            data-testid="new-entry-button"
            onClick={() => openNewEntry()}
          >
            <Plus className="size-4" />
            {copy.calendar.newEntry}
            <span className="text-primary-foreground/80">
              · {entryDateLabel}
            </span>
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PeriodSummaryBar summaries={summaries} budgetSummary={budgetSummary} />

      {showHint && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <p className="text-muted-foreground">{copy.calendar.clickDayHint}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => dismissCalendarHint()}
          >
            {copy.calendar.clickDayHintDismiss}
          </Button>
        </div>
      )}

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
            "finance-calendar rounded-xl border bg-card p-4 shadow-sm transition-opacity",
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
          dayCellClassNames={(arg) => {
            const key = toDateKey(arg.date);
            const summary = summaryMap.get(key);
            const classes = ["cursor-pointer"];
            if (key === today) {
              classes.push("fc-day-today-ring");
            }
            if (summary && (summary.incomeTotal > 0 || summary.expenseTotal > 0)) {
              classes.push("fc-day-has-activity");
            }
            return classes;
          }}
          dateClick={(info) => openDay(info.dateStr)}
          datesSet={handleDatesSet}
          dayCellContent={(arg: DayCellContentArg) => {
            const key = toDateKey(arg.date);
            const summary = summaryMap.get(key);
            const hasActivity =
              summary &&
              (summary.incomeTotal > 0 || summary.expenseTotal > 0);

            return (
              <div className="flex h-full flex-col gap-1 p-1.5">
                <div className="text-right text-xs font-medium text-muted-foreground">
                  {arg.dayNumberText}
                </div>
                {hasActivity && summary && (
                  <div className="mt-auto flex items-stretch gap-1.5">
                    <div className="flex w-1 shrink-0 flex-col overflow-hidden rounded-full">
                      {summary.incomeTotal > 0 && (
                        <div className="flex-1 bg-income" />
                      )}
                      {summary.expenseTotal > 0 && (
                        <div className="flex-1 bg-expense" />
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight text-money sm:text-sm",
                        balanceClass(summary.net),
                      )}
                    >
                      {formatCurrency(summary.net)}
                    </p>
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
