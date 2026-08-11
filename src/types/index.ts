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

export interface MonthTotalsData {
  year: number;
  month: number;
  performance: number;
  performanceStatus: string;
  saved: number;
  savedPercent: number;
  savedStatus: string;
  costOfLiving: number;
  costOfLivingStatus: string;
  dailyAverage: number;
  dailyCeiling: number | null;
  dailyStatus: string;
  totalIncome: number;
  totalExpense: number;
}

export interface HorizonDayCell {
  date: string;
  balance: number;
}

export interface HorizonMonthColumn {
  year: number;
  month: number;
  label: string;
  days: HorizonDayCell[];
}

export interface HorizonData {
  months: HorizonMonthColumn[];
  lowThreshold: number;
}

export interface FixedExpenseDTO {
  id: string;
  name: string;
  amount: number;
  sortOrder: number;
}

export interface UserSettingsDTO {
  openingBalance: number;
  dailyDivisor: number;
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
