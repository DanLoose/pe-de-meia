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
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState, useTransition } from "react";
import { createRecurringAction } from "@/app/actions/recurring";
import { upsertFixedExpenseAction } from "@/app/actions/fixed-expenses";
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
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { CategoryDTO } from "@/types";

const TOTAL_STEPS = 5;

type FixedBillDraft = {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: string;
};

type DailyItemDraft = {
  id: string;
  name: string;
  amount: number;
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

function defaultFixedBills(): FixedBillDraft[] {
  return [
    { id: newDraftId(), name: "Aluguel", amount: 0, dayOfMonth: "5" },
    { id: newDraftId(), name: "Internet", amount: 0, dayOfMonth: "10" },
    { id: newDraftId(), name: "Telefone", amount: 0, dayOfMonth: "15" },
  ];
}

function defaultDailyItems(): DailyItemDraft[] {
  return [{ id: newDraftId(), name: "Mercado", amount: 0 }];
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

  const expenseCategoryId =
    categories.find(
      (category) =>
        category.type === "EXPENSE" && category.ledgerColumn === "EXPENSE",
    )?.id ?? categories.find((category) => category.type === "EXPENSE")?.id;

  const saveStep = async (currentStep: number): Promise<boolean> => {
    if (currentStep === 1) {
      const result = await updateUserSettingsAction({
        openingBalance,
      });
      if (!result.success) return false;
    }

    if (currentStep === 2) {
      const bills = fixedBills.filter(
        (bill) => bill.name.trim() && bill.amount > 0,
      );
      for (const bill of bills) {
        if (!expenseCategoryId) continue;
        const result = await createRecurringAction({
          type: "EXPENSE",
          categoryId: expenseCategoryId,
          amount: bill.amount,
          description: bill.name.trim(),
          dayOfMonth: Number(bill.dayOfMonth),
        });
        if (!result.success) return false;
      }
    }

    if (currentStep === 3) {
      const items = dailyItems.filter(
        (item) => item.name.trim() && item.amount > 0,
      );
      for (const item of items) {
        const result = await upsertFixedExpenseAction({
          name: item.name.trim(),
          amount: item.amount,
        });
        if (!result.success) return false;
      }
    }

    if (currentStep === 4) {
      const result = await updateUserSettingsAction({
        cardClosingDay: Number(cardClosingDay),
        cardDueDay: Number(cardDueDay),
      });
      if (!result.success) return false;
    }

    return true;
  };

  const goNext = () => {
    startTransition(async () => {
      const ok = await saveStep(step);
      if (!ok) return;

      if (step >= TOTAL_STEPS) {
        const result = await completeOnboardingAction();
        if (!result.success) return;
        router.push("/saldos");
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
              <div className="space-y-3">
                {fixedBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_80px]"
                  >
                    <div className="space-y-1">
                      <Label>{copy.onboarding.stepFixedName}</Label>
                      <Input
                        value={bill.name}
                        onChange={(event) =>
                          setFixedBills((current) =>
                            current.map((item) =>
                              item.id === bill.id
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{copy.onboarding.stepFixedAmount}</Label>
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
                    <div className="space-y-1">
                      <Label>{copy.onboarding.stepFixedDay}</Label>
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
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFixedBills((current) => [
                    ...current,
                    {
                      id: newDraftId(),
                      name: "",
                      amount: 0,
                      dayOfMonth: "1",
                    },
                  ])
                }
              >
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
              <div className="space-y-3">
                {dailyItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
                  >
                    <div className="space-y-1">
                      <Label>{copy.onboarding.stepDailyName}</Label>
                      <Input
                        value={item.name}
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
                    <div className="space-y-1">
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
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDailyItems((current) => [
                    ...current,
                    { id: newDraftId(), name: "", amount: 0 },
                  ])
                }
              >
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
