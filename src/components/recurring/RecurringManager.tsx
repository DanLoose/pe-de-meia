"use client";

import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  createRecurringAction,
  deleteRecurringAction,
  toggleRecurringAction,
  updateRecurringAction,
} from "@/app/actions/recurring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { copy } from "@/lib/copy";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";
import type { CategoryDTO, RecurringTransactionDTO, TransactionType } from "@/types";

interface RecurringManagerProps {
  items: RecurringTransactionDTO[];
  categories: CategoryDTO[];
}

type RecurringFormState = {
  id?: string;
  type: TransactionType;
  amount: string;
  description: string;
  dayOfMonth: string;
  categoryId: string;
};

function buildEmptyForm(categories: CategoryDTO[]): RecurringFormState {
  const firstExpense = categories.find((category) => category.type === "EXPENSE");
  return {
    type: "EXPENSE",
    amount: "",
    description: "",
    dayOfMonth: "1",
    categoryId: firstExpense?.id ?? "",
  };
}

export function RecurringManager({
  items: initialItems,
  categories,
}: RecurringManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RecurringFormState>(() =>
    buildEmptyForm(categories),
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  const selectedCategoryId = filteredCategories.some(
    (category) => category.id === form.categoryId,
  )
    ? form.categoryId
    : (filteredCategories[0]?.id ?? "");

  const openCreate = () => {
    setForm(buildEmptyForm(categories));
    setFormOpen(true);
  };

  const openEdit = (item: RecurringTransactionDTO) => {
    setForm({
      id: item.id,
      type: item.type,
      amount: String(item.amount),
      description: item.description ?? "",
      dayOfMonth: String(item.dayOfMonth),
      categoryId: item.categoryId,
    });
    setFormOpen(true);
  };

  const saveRecurring = () => {
    startTransition(async () => {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description,
        dayOfMonth: Number(form.dayOfMonth),
        categoryId: selectedCategoryId,
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
        appToast.recurringUpdated();
      } else {
        appToast.recurringCreated();
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
      appToast.recurringDeleted();
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
      appToast.recurringUpdated();
    });
  };

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={Repeat}
          title={copy.recurring.empty}
          description={copy.recurring.subtitle}
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {copy.recurring.new}
            </Button>
          }
        />
        <RecurringFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          form={form}
          setForm={setForm}
          filteredCategories={filteredCategories}
          selectedCategoryId={selectedCategoryId}
          onSave={saveRecurring}
          isPending={isPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {copy.recurring.new}
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" style={{ borderColor: item.categoryColor }}>
                  {item.categoryName}
                </Badge>
                <Badge variant={item.active ? "default" : "secondary"}>
                  {item.active ? copy.recurring.active : copy.recurring.inactive}
                </Badge>
              </div>
              <p className="font-medium">
                {item.type === "INCOME" ? "+" : "-"}
                {formatCurrency(item.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.recurring.everyMonth} {item.dayOfMonth}
                {item.description ? ` · ${item.description}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleActive(item.id, !item.active)}
              >
                {item.active ? copy.recurring.inactive : copy.recurring.active}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPendingDeleteId(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <RecurringFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        form={form}
        setForm={setForm}
        filteredCategories={filteredCategories}
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
            <DialogTitle>{copy.recurring.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {copy.recurring.deleteDescription}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              {copy.entry.cancel}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {copy.categories.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecurringFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  filteredCategories,
  selectedCategoryId,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RecurringFormState;
  setForm: React.Dispatch<React.SetStateAction<RecurringFormState>>;
  filteredCategories: CategoryDTO[];
  selectedCategoryId: string;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {form.id ? copy.recurring.edit : copy.recurring.new}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{copy.entry.type}</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  type: (value ?? "EXPENSE") as TransactionType,
                  categoryId:
                    filteredCategories.find((category) => category.type === value)
                      ?.id ?? "",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <span>
                  {form.type === "INCOME" ? copy.entry.income : copy.entry.expense}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">{copy.entry.income}</SelectItem>
                <SelectItem value="EXPENSE">{copy.entry.expense}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-amount">{copy.entry.amount}</Label>
            <Input
              id="recurring-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-day">{copy.recurring.dayOfMonth}</Label>
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
          </div>
          <div className="space-y-2">
            <Label>{copy.entry.category}</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, categoryId: value ?? "" }))
              }
            >
              <SelectTrigger className="w-full">
                <span>
                  {filteredCategories.find(
                    (category) => category.id === selectedCategoryId,
                  )?.name ?? copy.entry.categoryPlaceholder}
                </span>
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
            <Label htmlFor="recurring-description">{copy.entry.note}</Label>
            <Input
              id="recurring-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={copy.entry.notePlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.entry.cancel}
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || !selectedCategoryId || !form.amount}
          >
            {form.id ? copy.entry.update : copy.entry.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
