"use client";

import { useMemo, useState, useTransition } from "react";
import type { TransactionType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { copy } from "@/lib/copy";
import { appToast } from "@/lib/toast";
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
  onOpenChange,
  createAction,
  updateAction,
  showSuccessToast = true,
}: EntryFormFieldsProps) {
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? defaultType ?? "EXPENSE",
  );
  const [amount, setAmount] = useState(transaction?.amount ?? 0);
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [entryDate, setEntryDate] = useState(transaction?.date ?? date ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [recurring, setRecurring] = useState(Boolean(transaction?.recurringId));
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

  const handleTypeChange = (value: TransactionType | null) => {
    if (!value) return;
    setType(value);
    const nextCategories = categories.filter((category) => category.type === value);
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
      recurring,
      ...(ledgerColumn ? { ledgerColumn } : {}),
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
      <DialogHeader>
        <DialogTitle>
          {transaction
            ? copy.entry.edit
            : lockType && type === "INCOME"
              ? copy.entry.newIncome
              : lockType && type === "EXPENSE"
                ? copy.entry.newExpense
                : copy.entry.new}
        </DialogTitle>
        <DialogDescription>{copy.entry.description}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="entry-form">
        {!lockType && (
          <div className="space-y-2">
            <Label htmlFor="entry-type">{copy.entry.type}</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="entry-type" className="w-full">
                <span>
                  {type === "INCOME" ? copy.entry.income : copy.entry.expense}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">{copy.entry.income}</SelectItem>
                <SelectItem value="EXPENSE">{copy.entry.expense}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="entry-amount">{copy.entry.amount}</Label>
          <MoneyInput
            id="entry-amount"
            data-testid="entry-amount"
            required
            value={amount}
            onValueChange={setAmount}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-date">{copy.entry.date}</Label>
          <Input
            id="entry-date"
            data-testid="entry-date"
            type="date"
            required
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-category">{copy.entry.category}</Label>
          <Select
            value={selectedCategoryId}
            onValueChange={(value) => setCategoryId(value ?? "")}
          >
            <SelectTrigger id="entry-category" className="w-full">
              {selectedCategory ? (
                <CategoryOption category={selectedCategory} />
              ) : (
                <span className="text-muted-foreground">
                  {copy.entry.categoryPlaceholder}
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-description">{copy.entry.note}</Label>
          <Input
            id="entry-description"
            data-testid="entry-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={copy.entry.notePlaceholder}
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              data-testid="entry-recurring"
              checked={recurring}
              onChange={(event) => setRecurring(event.target.checked)}
              className="size-4 rounded border border-input accent-primary"
            />
            {copy.entry.recurring}
          </label>
          {recurring && recurringDay != null && (
            <p className="pl-6 text-xs text-muted-foreground">
              {copy.entry.recurringHint(recurringDay)}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.entry.cancel}
          </Button>
          <Button
            type="submit"
            data-testid="entry-submit"
            disabled={isPending || !selectedCategoryId || amount <= 0}
          >
            {isPending
              ? copy.entry.saving
              : transaction
                ? copy.entry.update
                : copy.entry.create}
          </Button>
        </DialogFooter>
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
      <DialogContent>
        {props.open ? (
          <EntryFormFields key={formKey} formKey={formKey} {...props} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
