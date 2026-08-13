import { TransactionType, type LedgerColumn } from "@/generated/prisma/client";

export type { TransactionType, LedgerColumn };

export interface DailySummary {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
  net: number;
}

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  recurringId: string | null;
  ledgerColumn: LedgerColumn;
  affectsBalance: boolean;
  cardInvoiceId: string | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
}

export interface MonthData {
  events: TransactionDTO[];
  dailySummaries: DailySummary[];
  budgetSummary?: BudgetSummary | null;
}

export interface BudgetSummary {
  budgetTotal: number;
  expenseTotal: number;
}

export interface CategoryBudgetDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryType: TransactionType;
  year: number;
  month: number;
  amount: number;
}

export interface RecurringTransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  dayOfMonth: number;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LedgerDayRow {
  date: string;
  day: number;
  income: number;
  expense: number;
  daily: number;
  savings: number;
  card: number;
  balance: number;
}

export interface LedgerMonthData {
  year: number;
  month: number;
  openingBalance: number;
  rows: LedgerDayRow[];
  totals: {
    income: number;
    expense: number;
    daily: number;
    savings: number;
    card: number;
    balance: number;
  };
}

export type TotalsVerdict = "surplus" | "tight" | "deficit" | "empty";

export interface MonthTotalsData {
  year: number;
  month: number;
  /** Folga = fixedIncome − costOfLiving (kept as `performance` for compat). */
  performance: number;
  performanceStatus: string;
  fixedIncome: number;
  fixedExpense: number;
  setupComplete: boolean;
  verdict: TotalsVerdict;
  saved: number;
  savedPercent: number;
  savedStatus: string;
  costOfLiving: number;
  costOfLivingStatus: string;
  dailyAverage: number;
  dailyCeiling: number | null;
  /** Monthly sum of variable expense estimate (`FixedMonthlyExpense`). */
  variableEstimate: number | null;
  dailyStatus: string;
  totalIncome: number;
  totalExpense: number;
}

export interface HorizonDayMovement {
  id: string;
  source: "recurring" | "transaction" | "estimate";
  ruleId?: string;
  label: string;
  amount: number;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
  cashDelta: number;
}

export interface HorizonDayCell {
  date: string;
  balance: number;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isProjected: boolean;
  hasRecurring: boolean;
  delta: number;
  movements: HorizonDayMovement[];
}

export interface HorizonMonthColumn {
  year: number;
  month: number;
  label: string;
  days: HorizonDayCell[];
}

export interface HorizonSummary {
  currentBalance: number;
  endBalance: number;
  lowestBalance: number;
  lowestDate: string;
  firstNegativeDate: string | null;
  firstNegativeBalance: number | null;
  /** Accumulated cash inflows in the visible horizon (from today). */
  totalIncome: number;
  /** Accumulated cash outflows in the visible horizon (from today). */
  totalExpense: number;
}

export interface HorizonData {
  today: string;
  monthsCount: number;
  months: HorizonMonthColumn[];
  lowThreshold: number;
  summary: HorizonSummary;
}

export interface FixedExpenseDTO {
  id: string;
  name: string;
  amount: number;
  sortOrder: number;
}

export interface OnboardingStatus {
  /** True when a brand-new account should be sent to /comecar from Saldos. */
  needsOnboarding: boolean;
  /** True after the user finishes or skips the wizard. */
  wizardCompleted: boolean;
  hasOpeningBalance: boolean;
  hasRecurring: boolean;
  hasDailyForecast: boolean;
  hasTransactions: boolean;
}

export interface UserSettingsDTO {
  openingBalance: number;
  dailyDivisor: number;
  cardClosingDay: number;
  cardDueDay: number;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  name: string | null;
  email: string;
}

export interface DailyForecastData {
  expenses: FixedExpenseDTO[];
  dailyDivisor: number;
  totalFixed: number;
  dailyCeiling: number;
}
