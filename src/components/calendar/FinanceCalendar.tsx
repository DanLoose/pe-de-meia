"use client";

import type { DayCellContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  createTransactionAction,
  fetchMonthDataAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { DayDetailSheet } from "@/components/calendar/DayDetailSheet";
import { EntryForm } from "@/components/entries/EntryForm";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { CategoryDTO, DailySummary } from "@/types";

interface FinanceCalendarProps {
  categories: CategoryDTO[];
  initialSummaries: DailySummary[];
  initialYear: number;
  initialMonth: number;
}

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function FinanceCalendar({
  categories,
  initialSummaries,
  initialYear,
  initialMonth,
}: FinanceCalendarProps) {
  const [summaries, setSummaries] = useState<DailySummary[]>(initialSummaries);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDate, setEntryDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [visibleRange, setVisibleRange] = useState({
    year: initialYear,
    month: initialMonth,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summaryMap = useMemo(() => {
    return new Map(summaries.map((summary) => [summary.date, summary]));
  }, [summaries]);

  const loadMonth = useCallback((year: number, month: number) => {
    startTransition(async () => {
      const result = await fetchMonthDataAction(year, month);
      if (result.success && result.data) {
        setSummaries(result.data.dailySummaries);
        setError(null);
      } else {
        setError(result.error ?? "Failed to load calendar data");
      }
    });
  }, []);

  const handleDatesSet = useCallback(
    (arg: { start: Date; end: Date; view: { type: string } }) => {
      const anchor = new Date(arg.start);
      anchor.setDate(anchor.getDate() + 7);
      const year = anchor.getFullYear();
      const month = anchor.getMonth() + 1;

      setVisibleRange((current) => {
        if (current.year === year && current.month === month) {
          return current;
        }
        loadMonth(year, month);
        return { year, month };
      });
    },
    [loadMonth],
  );

  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSheetOpen(true);
  };

  const handleSavedFromHeader = () => {
    loadMonth(visibleRange.year, visibleRange.month);
    setEntryOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Track daily income and expenses at a glance.
          </p>
        </div>
        <Button
          data-testid="new-entry-button"
          onClick={() => {
            setEntryDate(format(new Date(), "yyyy-MM-dd"));
            setEntryOpen(true);
          }}
        >
          <Plus className="size-4" />
          New entry
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {isPending && (
        <p className="text-sm text-muted-foreground">Updating calendar...</p>
      )}

      <div className="rounded-xl border bg-card p-3 shadow-sm [&_.fc]:--fc-border-color:var(--border) [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:border-primary [&_.fc-toolbar-title]:text-lg [&_.fc-toolbar-title]:font-semibold">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
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
                <div className="text-right text-xs font-medium">{arg.dayNumberText}</div>
                {summary && (
                  <div className="space-y-0.5 text-[10px] leading-tight sm:text-xs">
                    {summary.incomeTotal > 0 && (
                      <div className="text-emerald-600">
                        +{formatCurrency(summary.incomeTotal)}
                      </div>
                    )}
                    {summary.expenseTotal > 0 && (
                      <div className="text-red-600">
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

      <DayDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        categories={categories}
        onChanged={() => loadMonth(visibleRange.year, visibleRange.month)}
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
