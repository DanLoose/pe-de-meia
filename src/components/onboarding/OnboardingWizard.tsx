"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Home,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  createRecurringAction,
  deleteRecurringAction,
  updateRecurringAction,
} from "@/app/actions/recurring";
import {
  deleteFixedExpenseAction,
  upsertFixedExpenseAction,
} from "@/app/actions/fixed-expenses";
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/app/actions/onboarding";
import { updateUserSettingsAction } from "@/app/actions/user-settings";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import type { CategoryDTO, TransactionType } from "@/types";

const TOTAL_STEPS = 5;

const INCOME_NAME_HINT =
  /\b(sal[aá]rio|renda|provento|vencimento|ordenado|pagamento|freelance|comiss[aã]o)\b/i;

type FixedBillDraft = {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  dayOfMonth: string;
  recurringId?: string;
};

type DailyItemDraft = {
  id: string;
  name: string;
  amount: number;
  expenseId?: string;
};

interface OnboardingWizardProps {
  categories: CategoryDTO[];
  initialOpeningBalance: number;
  initialCardClosingDay: number;
  initialCardDueDay: number;
}

function newDraftId() {
  return crypto.randomUUID();
}

function inferFixedType(name: string): TransactionType {
  return INCOME_NAME_HINT.test(name.trim()) ? "INCOME" : "EXPENSE";
}

function defaultFixedBills(): FixedBillDraft[] {
  return [
    {
      id: newDraftId(),
      name: "Salário",
      type: "INCOME",
      amount: 0,
      dayOfMonth: "5",
    },
    {
      id: newDraftId(),
      name: "Aluguel",
      type: "EXPENSE",
      amount: 0,
      dayOfMonth: "10",
    },
    {
      id: newDraftId(),
      name: "Internet",
      type: "EXPENSE",
      amount: 0,
      dayOfMonth: "15",
    },
  ];
}

function defaultDailyItems(): DailyItemDraft[] {
  return [{ id: newDraftId(), name: "Mercado", amount: 0 }];
}

function isValidBill(bill: FixedBillDraft) {
  return bill.name.trim().length > 0 && bill.amount > 0;
}

function isValidDailyItem(item: DailyItemDraft) {
  return item.name.trim().length > 0 && item.amount > 0;
}

export function OnboardingWizard({
  categories,
  initialOpeningBalance,
  initialCardClosingDay,
  initialCardDueDay,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [openingBalance, setOpeningBalance] = useState(initialOpeningBalance);
  const [fixedBills, setFixedBills] = useState<FixedBillDraft[]>(defaultFixedBills);
  const [dailyItems, setDailyItems] = useState<DailyItemDraft[]>(defaultDailyItems);
  const [cardClosingDay, setCardClosingDay] = useState(
    String(initialCardClosingDay),
  );
  const [cardDueDay, setCardDueDay] = useState(String(initialCardDueDay));
  const [isPending, startTransition] = useTransition();

  const categoryIdForType = (type: TransactionType) => {
    if (type === "INCOME") {
      return (
        categories.find(
          (category) =>
            category.type === "INCOME" && category.ledgerColumn === "INCOME",
        )?.id ?? categories.find((category) => category.type === "INCOME")?.id
      );
    }
    return (
      categories.find(
        (category) =>
          category.type === "EXPENSE" && category.ledgerColumn === "EXPENSE",
      )?.id ?? categories.find((category) => category.type === "EXPENSE")?.id
    );
  };

  const syncFixedBills = async (): Promise<boolean> => {
    const nextBills: FixedBillDraft[] = [];

    for (const bill of fixedBills) {
      if (!isValidBill(bill)) {
        if (bill.recurringId) {
          const result = await deleteRecurringAction(bill.recurringId);
          if (!result.success) {
            appToast.error(result.error ?? copy.toast.genericError);
            return false;
          }
        }
        nextBills.push({ ...bill, recurringId: undefined });
        continue;
      }

      const categoryId = categoryIdForType(bill.type);
      if (!categoryId) {
        appToast.error(copy.toast.genericError);
        return false;
      }

      const payload = {
        type: bill.type,
        categoryId,
        amount: bill.amount,
        description: bill.name.trim(),
        dayOfMonth: Number(bill.dayOfMonth),
      };

      if (bill.recurringId) {
        const result = await updateRecurringAction({
          id: bill.recurringId,
          ...payload,
        });
        if (!result.success) {
          appToast.error(result.error ?? copy.toast.genericError);
          return false;
        }
        nextBills.push(bill);
      } else {
        const result = await createRecurringAction(payload);
        if (!result.success || !result.data) {
          appToast.error(result.error ?? copy.toast.genericError);
          return false;
        }
        nextBills.push({ ...bill, recurringId: result.data.id });
      }
    }

    setFixedBills(nextBills);
    return true;
  };

  const syncDailyItems = async (): Promise<boolean> => {
    const nextItems: DailyItemDraft[] = [];

    for (const item of dailyItems) {
      if (!isValidDailyItem(item)) {
        if (item.expenseId) {
          const result = await deleteFixedExpenseAction(item.expenseId);
          if (!result.success) {
            appToast.error(result.error ?? copy.toast.genericError);
            return false;
          }
        }
        nextItems.push({ ...item, expenseId: undefined });
        continue;
      }

      const result = await upsertFixedExpenseAction({
        id: item.expenseId,
        name: item.name.trim(),
        amount: item.amount,
      });
      if (!result.success || !result.data) {
        appToast.error(result.error ?? copy.toast.genericError);
        return false;
      }
      nextItems.push({ ...item, expenseId: result.data.id });
    }

    setDailyItems(nextItems);
    return true;
  };

  const saveStep = async (currentStep: number): Promise<boolean> => {
    if (currentStep === 1) {
      const result = await updateUserSettingsAction({
        openingBalance,
      });
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return false;
      }
    }

    if (currentStep === 2) {
      return syncFixedBills();
    }

    if (currentStep === 3) {
      return syncDailyItems();
    }

    if (currentStep === 4) {
      const result = await updateUserSettingsAction({
        cardClosingDay: Number(cardClosingDay),
        cardDueDay: Number(cardDueDay),
      });
      if (!result.success) {
        appToast.error(result.error ?? copy.toast.genericError);
        return false;
      }
    }

    return true;
  };

  const goNext = () => {
    startTransition(async () => {
      const ok = await saveStep(step);
      if (!ok) return;

      if (step >= TOTAL_STEPS) {
        const result = await completeOnboardingAction();
        if (!result.success) {
          appToast.error(result.error ?? copy.toast.genericError);
          return;
        }
        router.push("/mapa-financeiro");
        router.refresh();
        return;
      }

      setStep((current) => current + 1);
    });
  };

  const goBack = () => setStep((current) => Math.max(1, current - 1));

  const handleSkip = () => {
    startTransition(async () => {
      await skipOnboardingAction();
    });
  };

  const removeFixedBill = (billId: string) => {
    startTransition(async () => {
      const bill = fixedBills.find((item) => item.id === billId);
      if (bill?.recurringId) {
        const result = await deleteRecurringAction(bill.recurringId);
        if (!result.success) {
          appToast.error(result.error ?? copy.toast.genericError);
          return;
        }
      }
      setFixedBills((current) => current.filter((item) => item.id !== billId));
    });
  };

  const removeDailyItem = (itemId: string) => {
    startTransition(async () => {
      const item = dailyItems.find((row) => row.id === itemId);
      if (item?.expenseId) {
        const result = await deleteFixedExpenseAction(item.expenseId);
        if (!result.success) {
          appToast.error(result.error ?? copy.toast.genericError);
          return;
        }
      }
      setDailyItems((current) => current.filter((row) => row.id !== itemId));
    });
  };

  const stepIcons = [Wallet, Home, PiggyBank, CreditCard, Sparkles];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          {copy.onboarding.stepOf(step, TOTAL_STEPS)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {copy.onboarding.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.onboarding.subtitle}</p>
      </div>

      <div className="flex justify-center gap-2">
        {stepIcons.map((Icon, index) => {
          const stepNumber = index + 1;
          const done = stepNumber < step;
          const active = stepNumber === step;
          return (
            <div
              key={stepNumber}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-hidden
            >
              {done ? <Check className="size-4" /> : <Icon className="size-4" />}
            </div>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {step === 1 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  {copy.onboarding.stepBalanceTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.stepBalanceDescription}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening-balance">
                  {copy.onboarding.stepBalanceLabel}
                </Label>
                <MoneyInput
                  id="opening-balance"
                  value={openingBalance}
                  onValueChange={setOpeningBalance}
                  className="max-w-xs"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  {copy.onboarding.stepFixedTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.stepFixedDescription}
                </p>
                <p className="text-xs text-muted-foreground">
                  {copy.onboarding.stepFixedExamples}
                </p>
              </div>

              <div className="space-y-2">
                {fixedBills.length > 0 ? (
                  <div
                    className="hidden gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_110px_140px_72px_36px]"
                    aria-hidden
                  >
                    <span>{copy.onboarding.stepFixedName}</span>
                    <span>{copy.onboarding.stepFixedType}</span>
                    <span>{copy.onboarding.stepFixedAmount}</span>
                    <span>{copy.onboarding.stepFixedDayShort}</span>
                    <span />
                  </div>
                ) : null}

                {fixedBills.length === 0 ? (
                  <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    {copy.onboarding.stepFixedEmpty}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fixedBills.map((bill) => (
                      <div
                        key={bill.id}
                        className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_110px_140px_72px_36px] sm:items-end"
                      >
                        <div className="space-y-1.5">
                          <Label className="sm:sr-only">
                            {copy.onboarding.stepFixedName}
                          </Label>
                          <Input
                            value={bill.name}
                            placeholder="Aluguel"
                            onChange={(event) => {
                              const name = event.target.value;
                              setFixedBills((current) =>
                                current.map((item) => {
                                  if (item.id !== bill.id) return item;
                                  const keepManualType =
                                    item.name.trim() !== "" &&
                                    inferFixedType(item.name) !== item.type;
                                  return {
                                    ...item,
                                    name,
                                    type: keepManualType
                                      ? item.type
                                      : inferFixedType(name),
                                  };
                                }),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="sm:sr-only">
                            {copy.onboarding.stepFixedType}
                          </Label>
                          <Select
                            value={bill.type}
                            onValueChange={(value) =>
                              setFixedBills((current) =>
                                current.map((item) =>
                                  item.id === bill.id
                                    ? {
                                        ...item,
                                        type: (value ??
                                          "EXPENSE") as TransactionType,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="w-full" size="sm">
                              <span>
                                {bill.type === "INCOME"
                                  ? copy.entry.income
                                  : copy.entry.expense}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INCOME">
                                {copy.entry.income}
                              </SelectItem>
                              <SelectItem value="EXPENSE">
                                {copy.entry.expense}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="sm:sr-only">
                            {copy.onboarding.stepFixedAmount}
                          </Label>
                          <MoneyInput
                            value={bill.amount}
                            onValueChange={(amount) =>
                              setFixedBills((current) =>
                                current.map((item) =>
                                  item.id === bill.id ? { ...item, amount } : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="flex items-end gap-2 sm:block sm:space-y-1.5">
                          <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
                            <Label className="sm:sr-only">
                              {copy.onboarding.stepFixedDayShort}
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={bill.dayOfMonth}
                              onChange={(event) =>
                                setFixedBills((current) =>
                                  current.map((item) =>
                                    item.id === bill.id
                                      ? { ...item, dayOfMonth: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive sm:hidden"
                            aria-label={copy.onboarding.stepFixedRemove}
                            disabled={isPending}
                            onClick={() => removeFixedBill(bill.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hidden shrink-0 text-muted-foreground hover:text-destructive sm:inline-flex"
                          aria-label={copy.onboarding.stepFixedRemove}
                          disabled={isPending}
                          onClick={() => removeFixedBill(bill.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  setFixedBills((current) => [
                    ...current,
                    {
                      id: newDraftId(),
                      name: "",
                      type: "EXPENSE",
                      amount: 0,
                      dayOfMonth: "1",
                    },
                  ])
                }
              >
                <Plus className="size-4" />
                {copy.onboarding.stepFixedAdd}
              </Button>
              <p className="text-xs text-muted-foreground">
                {copy.onboarding.stepFixedSkipHint}
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  {copy.onboarding.stepDailyTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.stepDailyDescription}
                </p>
                <p className="text-xs text-muted-foreground">
                  {copy.onboarding.stepDailyExamples}
                </p>
              </div>

              {dailyItems.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {copy.onboarding.stepDailyEmpty}
                </p>
              ) : (
                <div className="space-y-2">
                  {dailyItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>{copy.onboarding.stepDailyName}</Label>
                          <Input
                            value={item.name}
                            placeholder="Mercado"
                            onChange={(event) =>
                              setDailyItems((current) =>
                                current.map((row) =>
                                  row.id === item.id
                                    ? { ...row, name: event.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{copy.onboarding.stepDailyAmount}</Label>
                          <MoneyInput
                            value={item.amount}
                            onValueChange={(amount) =>
                              setDailyItems((current) =>
                                current.map((row) =>
                                  row.id === item.id ? { ...row, amount } : row,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 shrink-0 self-start text-muted-foreground hover:text-destructive sm:mt-7"
                        aria-label={copy.onboarding.stepDailyRemove}
                        disabled={isPending}
                        onClick={() => removeDailyItem(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  setDailyItems((current) => [
                    ...current,
                    { id: newDraftId(), name: "", amount: 0 },
                  ])
                }
              >
                <Plus className="size-4" />
                {copy.onboarding.stepDailyAdd}
              </Button>
              <p className="text-xs text-muted-foreground">
                {copy.onboarding.stepDailySkipHint}
              </p>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  {copy.onboarding.stepCardTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.stepCardDescription}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="card-closing">
                    {copy.onboarding.stepCardClosing}
                  </Label>
                  <Input
                    id="card-closing"
                    type="number"
                    min={1}
                    max={28}
                    value={cardClosingDay}
                    onChange={(event) => setCardClosingDay(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-due">{copy.onboarding.stepCardDue}</Label>
                  <Input
                    id="card-due"
                    type="number"
                    min={1}
                    max={28}
                    value={cardDueDay}
                    onChange={(event) => setCardDueDay(event.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.onboarding.stepCardHint}
              </p>
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">
                  {copy.onboarding.stepHowToTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.stepHowToDescription}
                </p>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="rounded-lg border bg-muted/30 p-3">
                  {copy.onboarding.stepHowToSaldos}
                </li>
                <li className="rounded-lg border bg-muted/30 p-3">
                  {copy.onboarding.stepHowToTotais}
                </li>
                <li className="rounded-lg border bg-muted/30 p-3">
                  {copy.onboarding.stepHowToRecurring}
                </li>
              </ol>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isPending}
          onClick={handleSkip}
        >
          {copy.onboarding.skip}
        </Button>

        <div className="flex gap-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={goBack}
            >
              <ArrowLeft className="size-4" />
              {copy.onboarding.back}
            </Button>
          ) : null}
          <Button type="button" disabled={isPending} onClick={goNext}>
            {step === TOTAL_STEPS ? copy.onboarding.finish : copy.onboarding.next}
            {step < TOTAL_STEPS ? <ArrowRight className="size-4" /> : null}
          </Button>
        </div>
      </div>

      {step === 5 ? (
        <p className="text-center text-xs text-muted-foreground">
          Depois você ajusta tudo em{" "}
          <Link href="/menu" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
            Menu
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
