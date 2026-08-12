"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Calendar,
  CalendarSync,
  Layers,
  Pencil,
  Tag,
  Wallet,
} from "lucide-react";
import type { TransactionType } from "@/generated/prisma/client";
import { ColumnGlyph } from "@/components/ledger/LedgerCells";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { copy } from "@/lib/copy";
import { formatSlashDate } from "@/lib/format";
import {
  defaultLedgerColumnForType,
  defaultTypeForLedgerColumn,
  LEDGER_COLUMN_LABELS,
  LEDGER_COLUMNS,
  ledgerColumnHint,
  ledgerColumnVariant,
} from "@/lib/ledger-columns";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ActionResult,
  CategoryDTO,
  LedgerColumn,
  TransactionDTO,
} from "@/types";

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  transaction?: TransactionDTO | null;
  defaultType?: TransactionType;
  lockType?: boolean;
  ledgerColumn?: LedgerColumn;
  onSaved: (transaction: TransactionDTO) => void;
  createAction: (input: unknown) => Promise<ActionResult<TransactionDTO>>;
  updateAction: (input: unknown) => Promise<ActionResult<TransactionDTO>>;
  showSuccessToast?: boolean;
}

interface EntryFormFieldsProps extends EntryFormProps {
  formKey: string;
}

const rowSelectTriggerClass =
  "h-auto w-full border-0 bg-transparent p-0 shadow-none ring-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent";

function FormRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4">
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CategoryOption({ category }: { category: CategoryDTO }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      {category.name}
    </span>
  );
}

function dayFromDate(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return Number(match[3]);
}

function EntryFormFields({
  date,
  categories,
  transaction,
  defaultType,
  lockType,
  ledgerColumn,
  onSaved,
  createAction,
  updateAction,
  showSuccessToast = true,
}: EntryFormFieldsProps) {
  const initialType = transaction?.type ?? defaultType ?? "EXPENSE";
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedColumn, setSelectedColumn] = useState<LedgerColumn>(
    transaction?.ledgerColumn ??
      ledgerColumn ??
      defaultLedgerColumnForType(initialType),
  );
  const [amount, setAmount] = useState(transaction?.amount ?? 0);
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [entryDate, setEntryDate] = useState(transaction?.date ?? date ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [recurring, setRecurring] = useState(Boolean(transaction?.recurringId));
  const [installmentCount, setInstallmentCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  const selectedCategoryId = filteredCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : (filteredCategories[0]?.id ?? "");

  const selectedCategory = filteredCategories.find(
    (category) => category.id === selectedCategoryId,
  );

  const recurringDay = dayFromDate(entryDate);
  const columnLabel = LEDGER_COLUMN_LABELS[selectedColumn].toLowerCase();

  const handleColumnChange = (value: string | null) => {
    if (!value) return;
    const column = value as LedgerColumn;
    const nextType = defaultTypeForLedgerColumn(column);
    setSelectedColumn(column);
    if (column !== "CARD") {
      setInstallmentCount(1);
    }
    setType(nextType);
    const nextCategories = categories.filter(
      (category) => category.type === nextType,
    );
    setCategoryId(nextCategories[0]?.id ?? "");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError(copy.entry.saveError);
      return;
    }

    const payload = {
      type,
      amount,
      description,
      date: entryDate,
      categoryId: selectedCategoryId,
      recurring: installmentCount > 1 ? false : recurring,
      ledgerColumn: selectedColumn,
      ...(selectedColumn === "CARD" && !transaction
        ? { installmentCount }
        : {}),
      ...(transaction ? { id: transaction.id } : {}),
    };

    startTransition(async () => {
      const result = transaction
        ? await updateAction(payload)
        : await createAction(payload);

      if (!result.success || !result.data) {
        setError(result.error ?? copy.entry.saveError);
        appToast.error(result.error ?? copy.entry.saveError);
        return;
      }

      if (showSuccessToast) {
        if (transaction) {
          appToast.entryUpdated();
        } else {
          appToast.entryCreated();
        }
      }

      onSaved(result.data);
    });
  };

  return (
    <>
      <DialogHeader className="gap-0 border-b px-4 py-4 pr-12">
        <DialogTitle className="lowercase">
          {transaction ? copy.entry.edit : copy.entry.new}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {copy.entry.description}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} data-testid="entry-form">
        <div className="divide-y">
          <FormRow icon={<Wallet className="size-4" />}>
            <MoneyInput
              id="entry-amount"
              data-testid="entry-amount"
              required
              value={amount}
              onValueChange={setAmount}
              className="h-auto border-0 bg-transparent px-0 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
          </FormRow>

          <FormRow
            icon={<ColumnGlyph variant={ledgerColumnVariant(selectedColumn)} />}
          >
            <Select
              value={selectedColumn}
              onValueChange={handleColumnChange}
              disabled={lockType}
            >
              <SelectTrigger
                id="entry-column"
                className={rowSelectTriggerClass}
                aria-label={copy.ledger.filterColumn}
              >
                <span className="lowercase">{columnLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {LEDGER_COLUMNS.map((column) => (
                  <SelectItem key={column} value={column}>
                    <span className="flex flex-col gap-0.5 lowercase">
                      <span className="flex items-center gap-2">
                        <ColumnGlyph variant={ledgerColumnVariant(column)} />
                        {LEDGER_COLUMN_LABELS[column]}
                      </span>
                      <span className="text-xs text-muted-foreground normal-case">
                        {ledgerColumnHint(column)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <p className="px-4 pb-1 text-xs text-muted-foreground">
            {ledgerColumnHint(selectedColumn)}
          </p>

          <FormRow icon={<Pencil className="size-4" />}>
            <Input
              id="entry-description"
              data-testid="entry-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.entry.notePlaceholder}
              className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
            />
          </FormRow>

          <FormRow icon={<Calendar className="size-4" />}>
            <label className="relative flex cursor-pointer items-center justify-between gap-3">
              <span className="text-muted-foreground lowercase">
                {copy.entry.date}
              </span>
              <span className="tabular-nums text-foreground">
                {entryDate ? formatSlashDate(entryDate) : "—"}
              </span>
              <Input
                id="entry-date"
                data-testid="entry-date"
                type="date"
                required
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </FormRow>

          {selectedColumn === "CARD" && !transaction ? (
            <FormRow icon={<Layers className="size-4" />}>
              <Select
                value={String(installmentCount)}
                onValueChange={(value) => {
                  const count = Number(value ?? 1);
                  setInstallmentCount(count);
                  if (count > 1) {
                    setRecurring(false);
                  }
                }}
              >
                <SelectTrigger
                  data-testid="entry-installments"
                  className={rowSelectTriggerClass}
                  aria-label={copy.entry.installments}
                >
                  <span className="lowercase">
                    {installmentCount > 1
                      ? copy.entry.installmentTimes(installmentCount)
                      : copy.entry.installmentOnce}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{copy.entry.installmentOnce}</SelectItem>
                  {Array.from({ length: 11 }, (_, index) => index + 2).map(
                    (count) => (
                      <SelectItem key={count} value={String(count)}>
                        {copy.entry.installmentTimes(count)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </FormRow>
          ) : null}

          {installmentCount <= 1 ? (
            <FormRow icon={<CalendarSync className="size-4" />}>
              <Select
                value={recurring ? "repeat" : "none"}
                onValueChange={(value) => setRecurring(value === "repeat")}
              >
                <SelectTrigger
                  data-testid="entry-recurring"
                  className={rowSelectTriggerClass}
                  aria-label={copy.entry.recurring}
                >
                  <span className="lowercase">
                    {recurring ? copy.entry.repeats : copy.entry.doesNotRepeat}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{copy.entry.doesNotRepeat}</SelectItem>
                  <SelectItem value="repeat">{copy.entry.repeats}</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          ) : null}

          {installmentCount <= 1 && recurring && recurringDay != null && (
            <p className="px-4 py-2 text-xs text-muted-foreground">
              {copy.entry.recurringHint(recurringDay)}
            </p>
          )}

          <FormRow icon={<Tag className="size-4" />}>
            <Select
              value={selectedCategoryId}
              onValueChange={(value) => setCategoryId(value ?? "")}
            >
              <SelectTrigger
                id="entry-category"
                className={rowSelectTriggerClass}
                aria-label={copy.entry.tags}
              >
                {selectedCategory ? (
                  <CategoryOption category={selectedCategory} />
                ) : (
                  <span className="text-muted-foreground lowercase">
                    {copy.entry.tags}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <CategoryOption category={category} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </div>

        {error && (
          <p className="px-4 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="p-4">
          <Button
            type="submit"
            data-testid="entry-submit"
            disabled={isPending || !selectedCategoryId || amount <= 0}
            className={cn(
              "h-11 w-full rounded-full text-sm font-semibold lowercase",
              "bg-income text-white hover:bg-income/90",
            )}
          >
            {isPending
              ? copy.entry.saving
              : transaction
                ? copy.entry.update
                : `${copy.entry.addAction} ${columnLabel}`}
          </Button>
        </div>
      </form>
    </>
  );
}

export function EntryForm(props: EntryFormProps) {
  const formKey = [
    props.transaction?.id ?? "new",
    props.date ?? "",
    props.defaultType ?? "",
    props.ledgerColumn ?? "",
  ].join(":");

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        {props.open ? (
          <EntryFormFields key={formKey} formKey={formKey} {...props} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
