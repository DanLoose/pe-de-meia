import type { TransactionType } from "@/generated/prisma/client";

export type DefaultCategory = {
  name: string;
  color: string;
  type: TransactionType;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Salário", color: "#22c55e", type: "INCOME" },
  { name: "Freelance", color: "#10b981", type: "INCOME" },
  { name: "Outras receitas", color: "#14b8a6", type: "INCOME" },
  { name: "Alimentação", color: "#ef4444", type: "EXPENSE" },
  { name: "Moradia", color: "#f97316", type: "EXPENSE" },
  { name: "Transporte", color: "#eab308", type: "EXPENSE" },
  { name: "Contas", color: "#a855f7", type: "EXPENSE" },
  { name: "Outras despesas", color: "#64748b", type: "EXPENSE" },
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
