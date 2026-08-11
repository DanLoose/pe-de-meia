"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { upsertBudgetAction } from "@/app/actions/budgets";
import { BudgetField } from "@/components/categories/BudgetField";
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
import { CATEGORY_COLOR_OPTIONS } from "@/lib/category-colors";
import { copy } from "@/lib/copy";
import { LEDGER_COLUMN_LABELS } from "@/lib/ledger-columns";
import { formatCurrency } from "@/lib/format";
import { appToast } from "@/lib/toast";
import type { CategoryBudgetDTO, CategoryDTO, LedgerColumn, TransactionType } from "@/types";

interface CategoryManagerProps {
  categories: CategoryDTO[];
  budgets: CategoryBudgetDTO[];
  year: number;
  month: number;
  monthLabel: string;
}

type CategoryFormState = {
  id?: string;
  name: string;
  color: string;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
};

const emptyForm: CategoryFormState = {
  name: "",
  color: CATEGORY_COLOR_OPTIONS[0],
  type: "EXPENSE",
  ledgerColumn: "EXPENSE",
};

export function CategoryManager({
  categories: initialCategories,
  budgets: initialBudgets,
  year,
  month,
  monthLabel,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState<CategoryDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  const budgetMap = useMemo(
    () => new Map(budgets.map((budget) => [budget.categoryId, budget.amount])),
    [budgets],
  );

  const grouped = useMemo(() => {
    return {
      income: categories.filter((category) => category.type === "INCOME"),
      expense: categories.filter((category) => category.type === "EXPENSE"),
    };
  }, [categories]);

  const openCreate = (type: TransactionType) => {
    setForm({ ...emptyForm, type });
    setFormOpen(true);
  };

  const openEdit = (category: CategoryDTO) => {
    setForm({
      id: category.id,
      name: category.name,
      color: category.color,
      type: category.type,
      ledgerColumn: category.ledgerColumn,
    });
    setFormOpen(true);
  };

  const saveCategory = () => {
    startTransition(async () => {
      const payload = {
        name: form.name,
        color: form.color,
        type: form.type,
        ledgerColumn: form.ledgerColumn,
        ...(form.id ? { id: form.id } : {}),
      };

      const result = form.id
        ? await updateCategoryAction(payload)
        : await createCategoryAction(payload);

      if (!result.success || !result.data) {
        appToast.error(result.error);
        return;
      }

      setCategories((current) => {
        if (form.id) {
          return current.map((item) =>
            item.id === result.data!.id ? result.data! : item,
          );
        }
        return [...current, result.data!].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });

      if (form.id) {
        appToast.categoryUpdated();
      } else {
        appToast.categoryCreated();
      }

      setFormOpen(false);
      setForm(emptyForm);
    });
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;

    const id = pendingDeleteId;
    setPendingDeleteId(null);

    startTransition(async () => {
      const result = await deleteCategoryAction(id);
      if (!result.success) {
        appToast.error(result.error);
        return;
      }

      setCategories((current) => current.filter((item) => item.id !== id));
      appToast.categoryDeleted();
    });
  };

  const [savingBudgetId, setSavingBudgetId] = useState<string | null>(null);

  const saveBudget = (categoryId: string, amount: string) => {
    const parsed = Number(amount);
    if (!amount || Number.isNaN(parsed) || parsed <= 0) {
      return;
    }

    setSavingBudgetId(categoryId);
    startTransition(async () => {
      const result = await upsertBudgetAction({
        categoryId,
        year,
        month,
        amount: parsed,
      });

      setSavingBudgetId(null);

      if (!result.success || !result.data) {
        appToast.error(result.error);
        return;
      }

      setBudgets((current) => {
        const next = current.filter((item) => item.categoryId !== categoryId);
        return [...next, result.data!];
      });
      appToast.budgetSaved();
    });
  };

  const renderSection = (
    title: string,
    items: CategoryDTO[],
    type: TransactionType,
  ) => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <Button size="sm" variant="outline" onClick={() => openCreate(type)}>
          <Plus className="size-4" />
          {copy.categories.new}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.categories.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((category) => (
            <div
              key={category.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {LEDGER_COLUMN_LABELS[category.ledgerColumn]}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={copy.categories.edit}
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={copy.categories.delete}
                    onClick={() => setPendingDeleteId(category.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {category.type === "EXPENSE" && (
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <p className="text-sm text-muted-foreground">
                    {budgetMap.has(category.id)
                      ? formatCurrency(budgetMap.get(category.id)!)
                      : copy.categories.budgetPlaceholder}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBudgetCategory(category)}
                  >
                    {copy.categories.setBudget}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title={copy.categories.empty}
        description={copy.categories.subtitle}
        action={
          <div className="flex gap-2">
            <Button onClick={() => openCreate("EXPENSE")}>
              {copy.categories.new}
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-8">
        {grouped.expense.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {copy.categories.budgetMonthLabel} {monthLabel}. {copy.categories.budgetHint}
          </p>
        )}
        {renderSection(copy.categories.income, grouped.income, "INCOME")}
        {renderSection(copy.categories.expense, grouped.expense, "EXPENSE")}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? copy.categories.edit : copy.categories.new}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{copy.categories.name}</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.categories.type}</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    type: (value ?? "EXPENSE") as TransactionType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <span>
                    {form.type === "INCOME"
                      ? copy.entry.income
                      : copy.entry.expense}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">{copy.entry.income}</SelectItem>
                  <SelectItem value="EXPENSE">{copy.entry.expense}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy.categories.ledgerColumn}</Label>
              <Select
                value={form.ledgerColumn}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    ledgerColumn: (value ?? "EXPENSE") as LedgerColumn,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <span>{LEDGER_COLUMN_LABELS[form.ledgerColumn]}</span>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LEDGER_COLUMN_LABELS) as LedgerColumn[]).map(
                    (column) => (
                      <SelectItem key={column} value={column}>
                        {LEDGER_COLUMN_LABELS[column]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{copy.categories.color}</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    className="size-8 rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: color,
                      borderColor: form.color === color ? "#000" : "transparent",
                    }}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {copy.categories.cancel}
            </Button>
            <Button onClick={saveCategory} disabled={isPending || !form.name.trim()}>
              {form.id ? copy.categories.update : copy.categories.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={budgetCategory !== null}
        onOpenChange={(open) => !open && setBudgetCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {copy.categories.setBudget}
              {budgetCategory ? ` — ${budgetCategory.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {budgetCategory && (
            <BudgetField
              key={`${budgetCategory.id}-${budgetMap.get(budgetCategory.id) ?? "none"}`}
              categoryId={budgetCategory.id}
              savedAmount={budgetMap.get(budgetCategory.id)}
              onSave={(categoryId, amount) => {
                saveBudget(categoryId, amount);
                setBudgetCategory(null);
              }}
              disabled={savingBudgetId === budgetCategory.id}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{copy.categories.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {copy.categories.deleteDescription}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              {copy.categories.cancel}
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
