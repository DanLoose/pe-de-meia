"use client";

import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createRecurringAction,
  deleteRecurringAction,
  toggleRecurringAction,
  updateRecurringAction,
} from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { copy } from "@/lib/copy";
import { expenseClass, incomeClass } from "@/lib/design";
import { formatCurrency, formatSlashDate } from "@/lib/format";
import { appToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { CategoryDTO, RecurringTransactionDTO, TransactionType } from "@/types";

interface RecurringManagerProps {
  items: RecurringTransactionDTO[];
  categories: CategoryDTO[];
  onItemsChange?: (items: RecurringTransactionDTO[]) => void;
}

type RecurringFormState = {
  id?: string;
  type: TransactionType;
  amount: number;
  description: string;
  dayOfMonth: string;
  endsOn: string;
  categoryId: string;
};

function buildEmptyForm(
  categories: CategoryDTO[],
  type: TransactionType = "EXPENSE",
): RecurringFormState {
  const first = categories.find((category) => category.type === type);
  return {
    type,
    amount: 0,
    description: "",
    dayOfMonth: "1",
    endsOn: "",
    categoryId: first?.id ?? "",
  };
}

export function RecurringManager({
  items: itemsProp,
  categories,
  onItemsChange,
}: RecurringManagerProps) {
  const [localItems, setLocalItems] = useState(itemsProp);
  const items = onItemsChange ? itemsProp : localItems;
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RecurringFormState>(() =>
    buildEmptyForm(categories),
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!onItemsChange) {
      setLocalItems(itemsProp);
    }
  }, [itemsProp, onItemsChange]);

  const setItems = (
    updater:
      | RecurringTransactionDTO[]
      | ((current: RecurringTransactionDTO[]) => RecurringTransactionDTO[]),
  ) => {
    const next = typeof updater === "function" ? updater(items) : updater;
    if (onItemsChange) {
      onItemsChange(next);
    } else {
      setLocalItems(next);
    }
  };

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  const selectedCategoryId = filteredCategories.some(
    (category) => category.id === form.categoryId,
  )
    ? form.categoryId
    : (filteredCategories[0]?.id ?? "");

  const incomes = useMemo(
    () =>
      items
        .filter((item) => item.type === "INCOME")
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [items],
  );
  const expenses = useMemo(
    () =>
      items
        .filter((item) => item.type === "EXPENSE")
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [items],
  );

  const openCreate = (type: TransactionType = "EXPENSE") => {
    setForm(buildEmptyForm(categories, type));
    setFormOpen(true);
  };

  const openEdit = (item: RecurringTransactionDTO) => {
    setForm({
      id: item.id,
      type: item.type,
      amount: item.amount,
      description: item.description ?? "",
      dayOfMonth: String(item.dayOfMonth),
      endsOn: item.endsOn ?? "",
      categoryId: item.categoryId,
    });
    setFormOpen(true);
  };

  const saveRecurring = () => {
    startTransition(async () => {
      const payload = {
        type: form.type,
        amount: form.amount,
        description: form.description,
        dayOfMonth: Number(form.dayOfMonth),
        categoryId: selectedCategoryId,
        endsOn: form.endsOn.trim() ? form.endsOn : null,
        ...(form.id ? { id: form.id } : {}),
      };

      const result = form.id
        ? await updateRecurringAction(payload)
        : await createRecurringAction(payload);

      if (!result.success || !result.data) {
        appToast.error(result.error);
        return;
      }

      setItems((current) => {
        if (form.id) {
          return current.map((item) =>
            item.id === result.data!.id ? result.data! : item,
          );
        }
        return [...current, result.data!];
      });

      if (form.id) {
        appToast.fixedExpenseUpdated();
      } else {
        appToast.fixedExpenseCreated();
      }

      setFormOpen(false);
    });
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);

    startTransition(async () => {
      const result = await deleteRecurringAction(id);
      if (!result.success) {
        appToast.error(result.error);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
      appToast.fixedExpenseDeleted();
    });
  };

  const toggleActive = (id: string, active: boolean) => {
    startTransition(async () => {
      const result = await toggleRecurringAction(id, active);
      if (!result.success || !result.data) {
        appToast.error(result.error);
        return;
      }
      setItems((current) =>
        current.map((item) => (item.id === id ? result.data! : item)),
      );
      appToast.fixedExpenseUpdated();
    });
  };

  return (
    <>
      <div className="space-y-8">
        <CommitmentGroup
          title={copy.compromissosStudio.incomeGroup}
          hint={copy.compromissosStudio.incomeHint}
          empty={copy.compromissosStudio.emptyIncome}
          items={incomes}
          onAdd={() => openCreate("INCOME")}
          onEdit={openEdit}
          onToggle={toggleActive}
          onDelete={setPendingDeleteId}
          addLabel={copy.compromissosStudio.addIncome}
        />
        <CommitmentGroup
          title={copy.compromissosStudio.expenseGroup}
          hint={copy.compromissosStudio.expenseHint}
          empty={copy.compromissosStudio.emptyExpense}
          items={expenses}
          onAdd={() => openCreate("EXPENSE")}
          onEdit={openEdit}
          onToggle={toggleActive}
          onDelete={setPendingDeleteId}
          addLabel={copy.compromissosStudio.addExpense}
        />
      </div>

      <RecurringFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSave={saveRecurring}
        isPending={isPending}
      />

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{copy.fixedExpenses.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {copy.fixedExpenses.deleteDescription}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              {copy.entry.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {copy.categories.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommitmentGroup({
  title,
  hint,
  empty,
  items,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
  addLabel,
}: {
  title: string;
  hint: string;
  empty: string;
  items: RecurringTransactionDTO[];
  onAdd: () => void;
  onEdit: (item: RecurringTransactionDTO) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          className="rounded-full shadow-sm"
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <CommitmentRow
                item={item}
                onEdit={() => onEdit(item)}
                onToggle={() => onToggle(item.id, !item.active)}
                onDelete={() => onDelete(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommitmentRow({
  item,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: RecurringTransactionDTO;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isIncome = item.type === "INCOME";
  const label = item.description?.trim() || item.categoryName;

  return (
    <div
      className={cn(
        "group flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-3 transition-all sm:flex-nowrap sm:px-4",
        "hover:-translate-y-0.5 hover:shadow-md",
        item.active
          ? isIncome
            ? "border-income/20 bg-gradient-to-r from-income/[0.08] to-background"
            : "border-expense/20 bg-gradient-to-r from-expense/[0.08] to-background"
          : "border-border/50 bg-muted/30 opacity-70",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl text-sm font-semibold",
          isIncome ? "bg-income/15 text-income" : "bg-expense/15 text-expense",
        )}
      >
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
          dia
        </span>
        <span className="tabular-nums leading-none">{item.dayOfMonth}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{label}</p>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              isIncome
                ? "bg-income/15 text-income"
                : "bg-expense/15 text-expense",
            )}
          >
            {isIncome
              ? copy.commitmentsMap.badgeIncome
              : copy.commitmentsMap.badgeExpense}
          </span>
          {!item.active ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.fixedExpenses.inactive}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {copy.fixedExpenses.everyMonth} {item.dayOfMonth}
          {item.endsOn
            ? ` · ${copy.fixedExpenses.endsOnUntil(formatSlashDate(item.endsOn))}`
            : null}
        </p>
      </div>

      <p
        className={cn(
          "shrink-0 text-base font-semibold sm:text-lg",
          isIncome ? incomeClass() : expenseClass(),
        )}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(item.amount)}
      </p>

      <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={
            item.active ? copy.fixedExpenses.inactive : copy.fixedExpenses.active
          }
          onClick={onToggle}
        >
          <Power className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          aria-label={copy.fixedExpenses.edit}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-expense"
          aria-label={copy.categories.delete}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function RecurringFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  selectedCategoryId,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RecurringFormState;
  setForm: React.Dispatch<React.SetStateAction<RecurringFormState>>;
  categories: CategoryDTO[];
  selectedCategoryId: string;
  onSave: () => void;
  isPending: boolean;
}) {
  const name = form.description.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {form.id ? copy.fixedExpenses.edit : copy.fixedExpenses.new}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recurring-name">{copy.fixedExpenses.name}</Label>
            <Input
              id="recurring-name"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={copy.fixedExpenses.namePlaceholder}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{copy.entry.type}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["INCOME", "EXPENSE"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((current) => {
                      const nextCats = categories.filter((c) => c.type === type);
                      return {
                        ...current,
                        type,
                        categoryId: nextCats[0]?.id ?? "",
                      };
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    form.type === type
                      ? type === "INCOME"
                        ? "border-income/40 bg-income/10 text-income"
                        : "border-expense/40 bg-expense/10 text-expense"
                      : "border-border/70 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {type === "INCOME" ? copy.entry.income : copy.entry.expense}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-amount">{copy.entry.amount}</Label>
            <MoneyInput
              id="recurring-amount"
              value={form.amount}
              onValueChange={(amount) =>
                setForm((current) => ({ ...current, amount }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-day">{copy.fixedExpenses.dayOfMonth}</Label>
            <Input
              id="recurring-day"
              type="number"
              min="1"
              max="31"
              value={form.dayOfMonth}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dayOfMonth: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {copy.fixedExpenses.dayOfMonthHint}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-ends-on">{copy.fixedExpenses.endsOn}</Label>
            <Input
              id="recurring-ends-on"
              type="date"
              value={form.endsOn}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endsOn: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {copy.fixedExpenses.endsOnHint}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.entry.cancel}
          </Button>
          <Button
            onClick={onSave}
            disabled={
              isPending ||
              !selectedCategoryId ||
              form.amount <= 0 ||
              !name
            }
          >
            {form.id ? copy.entry.update : copy.entry.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
