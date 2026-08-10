import { TransactionType } from "@/generated/prisma/client";

export type { TransactionType };

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
