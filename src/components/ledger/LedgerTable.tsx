"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchLedgerMonthAction } from "@/app/actions/ledger";
import { BalanceCell } from "@/components/ledger/BalanceCell";
import { LedgerDaySheet } from "@/components/ledger/LedgerDaySheet";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { expenseClass, incomeClass, ledgerMovementClass, ledgerRowHasActivity } from "@/lib/design";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryDTO, LedgerMonthData } from "@/types";

interface LedgerTableProps {
  initialData: LedgerMonthData;
  categories: CategoryDTO[];
  today: string;
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function MoneyCell({
  value,
  variant,
}: {
  value: number;
  variant: "income" | "expense" | "neutral";
}) {
  if (value === 0) {
    return (
      <td className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/35">
        —
      </td>
    );
  }

  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right text-sm",
        ledgerMovementClass(value, variant),
      )}
    >
      {formatCurrency(value)}
    </td>
  );
}

export function LedgerTable({
  initialData,
  categories,
  today,
}: LedgerTableProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const year = data.year;
  const month = data.month;
  const showExtendedColumns = true;

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#day-")) {
      return;
    }
    const row = document.querySelector(hash);
    row?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [year, month, today]);

  const navigateMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(year, month, delta);
      startTransition(() => {
        router.push(`/saldos?year=${next.year}&month=${next.month}`);
      });
    },
    [year, month, router],
  );

  const goToToday = () => {
    const [y, m] = today.split("-").map(Number);
    startTransition(() => {
      router.push(`/saldos?year=${y}&month=${m}`);
    });
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setSheetOpen(true);
  };

  const handleChanged = () => {
    startTransition(async () => {
      const result = await fetchLedgerMonthAction(year, month);
      if (result.success && result.data) {
        setData(result.data);
      }
    });
  };

  const handleDayNavigate = (date: string) => {
    setSelectedDate(date);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={copy.ledger.prevMonth}
              onClick={() => navigateMonth(-1)}
              disabled={isPending}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-[180px] text-center text-lg font-semibold capitalize">
              {monthLabel(year, month)}
            </h2>
            <Button
              variant="outline"
              size="icon"
              aria-label={copy.ledger.nextMonth}
              onClick={() => navigateMonth(1)}
              disabled={isPending}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday} disabled={isPending}>
            {copy.calendar.today}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">{copy.ledger.day}</th>
                <th className="px-3 py-2 text-right font-medium text-income">
                  {copy.ledger.income}
                </th>
                <th className="px-3 py-2 text-right font-medium text-expense">
                  {copy.ledger.expense}
                </th>
                {showExtendedColumns && (
                  <>
                    <th className="px-3 py-2 text-right font-medium">{copy.ledger.daily}</th>
                    <th className="px-3 py-2 text-right font-medium">{copy.ledger.savings}</th>
                    <th className="px-3 py-2 text-right font-medium">{copy.ledger.card}</th>
                  </>
                )}
                <th className="px-3 py-2 text-right font-medium">{copy.ledger.balance}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const isToday = row.date === today;
                const hasActivity = ledgerRowHasActivity(row);
                return (
                  <tr
                    key={row.date}
                    id={isToday ? `day-${row.date}` : undefined}
                    data-testid={`ledger-row-${row.date}`}
                    data-has-activity={hasActivity ? "true" : "false"}
                    className={cn(
                      "cursor-pointer border-b transition-colors hover:bg-muted/40",
                      !hasActivity && !isToday && "bg-muted/20",
                      hasActivity && "bg-card",
                      isToday && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                    )}
                    onClick={() => handleDayClick(row.date)}
                  >
                    <td
                      className={cn(
                        "px-3 py-1.5 tabular-nums",
                        hasActivity || isToday
                          ? "font-semibold text-foreground"
                          : "font-normal text-muted-foreground/55",
                        isToday && "text-primary",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {hasActivity && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                        {String(row.day).padStart(2, "0")}
                      </span>
                    </td>
                    <MoneyCell value={row.income} variant="income" />
                    <MoneyCell value={row.expense} variant="expense" />
                    {showExtendedColumns && (
                      <>
                        <MoneyCell value={row.daily} variant="expense" />
                        <MoneyCell value={row.savings} variant="income" />
                        <MoneyCell value={row.card} variant="expense" />
                      </>
                    )}
                    <BalanceCell value={row.balance} muted={!hasActivity} />
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-3 py-2">{copy.ledger.total}</td>
                <td className={cn("px-3 py-2 text-right", incomeClass())}>
                  {formatCurrency(data.totals.income)}
                </td>
                <td className={cn("px-3 py-2 text-right", expenseClass())}>
                  {formatCurrency(data.totals.expense)}
                </td>
                {showExtendedColumns && (
                  <>
                    <td className={cn("px-3 py-2 text-right", expenseClass())}>
                      {formatCurrency(data.totals.daily)}
                    </td>
                    <td className={cn("px-3 py-2 text-right", incomeClass())}>
                      {formatCurrency(data.totals.savings)}
                    </td>
                    <td className={cn("px-3 py-2 text-right", expenseClass())}>
                      {formatCurrency(data.totals.card)}
                    </td>
                  </>
                )}
                <BalanceCell value={data.totals.balance} className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <LedgerDaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        categories={categories}
        onChanged={handleChanged}
        onNavigate={handleDayNavigate}
        monthDates={data.rows.map((row) => row.date)}
      />
    </>
  );
}
