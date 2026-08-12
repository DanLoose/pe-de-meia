"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchLedgerMonthAction } from "@/app/actions/ledger";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { EntryForm } from "@/components/entries/EntryForm";
import { BalanceCell } from "@/components/ledger/BalanceCell";
import {
  ColumnGlyph,
  DayCell,
  ledgerCellClass,
  MovementCell,
  MovementCellContent,
  type LedgerMovementVariant,
} from "@/components/ledger/LedgerCells";
import { LedgerDaySheet } from "@/components/ledger/LedgerDaySheet";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { ledgerRowHasActivity } from "@/lib/design";
import { cn } from "@/lib/utils";
import type {
  CategoryDTO,
  LedgerColumn,
  LedgerMonthData,
  TransactionType,
} from "@/types";

interface LedgerTableProps {
  initialData: LedgerMonthData;
  categories: CategoryDTO[];
  today: string;
}

type CellDraft = {
  date: string;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
};

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

function HeaderCell({
  children,
  align = "right",
  className,
  variant,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  variant?: LedgerMovementVariant;
}) {
  return (
    <th
      className={cn(
        ledgerCellClass,
        "sticky top-0 z-20 whitespace-nowrap bg-muted px-2.5 py-2 font-medium shadow-[0_1px_0_0_var(--border)]",
        align === "left" ? "border-l text-left" : "text-left",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        {variant ? <ColumnGlyph variant={variant} /> : null}
        {children}
      </span>
    </th>
  );
}

function TotalCell({
  value,
  variant,
}: {
  value: number;
  variant: LedgerMovementVariant;
}) {
  return (
    <td
      className={cn(
        ledgerCellClass,
        "sticky bottom-0 z-20 cursor-default border-t bg-muted font-medium",
      )}
    >
      <MovementCellContent value={value} variant={variant} compact />
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
  const [draft, setDraft] = useState<CellDraft | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const year = data.year;
  const month = data.month;

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

  const handleColumnClick = (
    date: string,
    type: TransactionType,
    ledgerColumn: LedgerColumn,
  ) => {
    setDraft({ date, type, ledgerColumn });
    setFormOpen(true);
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
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
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

        <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-lg border bg-card">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <HeaderCell align="left">{copy.ledger.day}</HeaderCell>
                <HeaderCell className="text-income" variant="income">
                  {copy.ledger.income}
                </HeaderCell>
                <HeaderCell className="text-expense" variant="expense">
                  {copy.ledger.expense}
                </HeaderCell>
                <HeaderCell variant="daily">{copy.ledger.daily}</HeaderCell>
                <HeaderCell variant="savings">{copy.ledger.savings}</HeaderCell>
                <HeaderCell variant="card">{copy.ledger.card}</HeaderCell>
                <HeaderCell>{copy.ledger.balance}</HeaderCell>
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
                    className={cn(isToday && "bg-primary/5")}
                  >
                    <DayCell
                      date={row.date}
                      day={row.day}
                      isToday={isToday}
                      hasActivity={hasActivity}
                      onClick={() => handleDayClick(row.date)}
                    />
                    <MovementCell
                      date={row.date}
                      value={row.income}
                      variant="income"
                      selected={draft?.date === row.date && draft.type === "INCOME"}
                      onClick={() =>
                        handleColumnClick(row.date, "INCOME", "INCOME")
                      }
                    />
                    <MovementCell
                      date={row.date}
                      value={row.expense}
                      variant="expense"
                      selected={draft?.date === row.date && draft.type === "EXPENSE"}
                      onClick={() =>
                        handleColumnClick(row.date, "EXPENSE", "EXPENSE")
                      }
                    />
                    <MovementCell
                      date={row.date}
                      value={row.daily}
                      variant="daily"
                    />
                    <MovementCell
                      date={row.date}
                      value={row.savings}
                      variant="savings"
                    />
                    <MovementCell
                      date={row.date}
                      value={row.card}
                      variant="card"
                    />
                    <BalanceCell value={row.balance} muted={!hasActivity} />
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr data-testid="ledger-totals">
                <td
                  className={cn(
                    ledgerCellClass,
                    "sticky bottom-0 z-20 border-l border-t bg-muted px-2.5 py-2 font-medium",
                  )}
                >
                  {copy.ledger.total}
                </td>
                <TotalCell value={data.totals.income} variant="income" />
                <TotalCell value={data.totals.expense} variant="expense" />
                <TotalCell value={data.totals.daily} variant="daily" />
                <TotalCell value={data.totals.savings} variant="savings" />
                <TotalCell value={data.totals.card} variant="card" />
                <BalanceCell
                  value={data.totals.balance}
                  header
                  className="sticky bottom-0 z-20 border-t bg-muted"
                />
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

      <EntryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setDraft(null);
        }}
        date={draft?.date ?? null}
        categories={categories}
        defaultType={draft?.type}
        lockType
        ledgerColumn={draft?.ledgerColumn}
        onSaved={() => {
          setFormOpen(false);
          setDraft(null);
          handleChanged();
        }}
        createAction={createTransactionAction}
        updateAction={updateTransactionAction}
      />
    </>
  );
}
