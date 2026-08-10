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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult, CategoryDTO, TransactionDTO } from "@/types";

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  categories: CategoryDTO[];
  transaction?: TransactionDTO | null;
  onSaved: (transaction: TransactionDTO) => void;
  createAction: (input: unknown) => Promise<ActionResult<TransactionDTO>>;
  updateAction: (input: unknown) => Promise<ActionResult<TransactionDTO>>;
}

interface EntryFormFieldsProps extends EntryFormProps {
  formKey: string;
}

function EntryFormFields({
  date,
  categories,
  transaction,
  onSaved,
  onOpenChange,
  createAction,
  updateAction,
}: EntryFormFieldsProps) {
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? "EXPENSE",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : "",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [entryDate, setEntryDate] = useState(transaction?.date ?? date ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
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

  const handleTypeChange = (value: TransactionType | null) => {
    if (!value) return;
    setType(value);
    const nextCategories = categories.filter((category) => category.type === value);
    setCategoryId(nextCategories[0]?.id ?? "");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = {
      type,
      amount: Number(amount),
      description,
      date: entryDate,
      categoryId: selectedCategoryId,
      ...(transaction ? { id: transaction.id } : {}),
    };

    startTransition(async () => {
      const result = transaction
        ? await updateAction(payload)
        : await createAction(payload);

      if (!result.success || !result.data) {
        setError(result.error ?? "Could not save entry");
        return;
      }

      onSaved(result.data);
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{transaction ? "Edit entry" : "New entry"}</DialogTitle>
        <DialogDescription>
          Record an income or expense for your calendar.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="entry-form">
        <div className="space-y-2">
          <Label htmlFor="entry-type">Type</Label>
          <Select value={type} onValueChange={handleTypeChange}>
            <SelectTrigger id="entry-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-amount">Amount</Label>
            <Input
              id="entry-amount"
              data-testid="entry-amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-date">Date</Label>
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
          <Label htmlFor="entry-category">Category</Label>
          <Select
            value={selectedCategoryId}
            onValueChange={(value) => setCategoryId(value ?? "")}
          >
            <SelectTrigger id="entry-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entry-description">Description</Label>
            <Input
              id="entry-description"
              data-testid="entry-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional note"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" data-testid="entry-submit" disabled={isPending || !selectedCategoryId}>
            {isPending ? "Saving..." : transaction ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function EntryForm(props: EntryFormProps) {
  const formKey = props.transaction?.id ?? props.date ?? "new";

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
