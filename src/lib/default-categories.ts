import type { TransactionType } from "@/generated/prisma/client";
import type { LedgerColumn } from "@/generated/prisma/client";

export type DefaultCategory = {
  name: string;
  color: string;
  type: TransactionType;
  ledgerColumn: LedgerColumn;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Salário", color: "#22c55e", type: "INCOME", ledgerColumn: "INCOME" },
  { name: "Freelance", color: "#10b981", type: "INCOME", ledgerColumn: "INCOME" },
  { name: "Outras receitas", color: "#14b8a6", type: "INCOME", ledgerColumn: "INCOME" },
  { name: "Alimentação", color: "#ef4444", type: "EXPENSE", ledgerColumn: "DAILY" },
  { name: "Moradia", color: "#f97316", type: "EXPENSE", ledgerColumn: "EXPENSE" },
  { name: "Transporte", color: "#eab308", type: "EXPENSE", ledgerColumn: "DAILY" },
  { name: "Contas", color: "#a855f7", type: "EXPENSE", ledgerColumn: "EXPENSE" },
  { name: "Outras despesas", color: "#64748b", type: "EXPENSE", ledgerColumn: "EXPENSE" },
];

/** Maps legacy English seed names to pt-BR for existing databases. */
export const LEGACY_CATEGORY_NAME_MAP: Record<string, string> = {
  Salary: "Salário",
  Freelance: "Freelance",
  "Other Income": "Outras receitas",
  Food: "Alimentação",
  Rent: "Moradia",
  Transport: "Transporte",
  Utilities: "Contas",
  "Other Expense": "Outras despesas",
};
