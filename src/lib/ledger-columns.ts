import type { LedgerColumn as PrismaLedgerColumn } from "@/generated/prisma/client";
import type { LedgerColumn } from "@/types";

export function defaultLedgerColumnForType(
  type: "INCOME" | "EXPENSE",
): PrismaLedgerColumn {
  return type === "INCOME" ? "INCOME" : "EXPENSE";
}

export function resolveLedgerColumn(
  txLedgerColumn: PrismaLedgerColumn | null | undefined,
  categoryLedgerColumn: PrismaLedgerColumn,
): LedgerColumn {
  return (txLedgerColumn ?? categoryLedgerColumn) as LedgerColumn;
}

export const LEDGER_COLUMN_LABELS: Record<LedgerColumn, string> = {
  INCOME: "Entradas",
  EXPENSE: "Saídas",
  DAILY: "Diários",
  SAVINGS: "Economias",
  CARD: "Cartão",
};

export const DEFAULT_CATEGORY_LEDGER: Record<string, PrismaLedgerColumn> = {
  Salário: "INCOME",
  Freelance: "INCOME",
  "Outras receitas": "INCOME",
  Alimentação: "DAILY",
  Moradia: "EXPENSE",
  Transporte: "DAILY",
  Contas: "EXPENSE",
  "Outras despesas": "EXPENSE",
};
