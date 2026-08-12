import type { LedgerColumn as PrismaLedgerColumn } from "@/generated/prisma/client";
import { copy } from "@/lib/copy";
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

export function defaultTypeForLedgerColumn(
  column: LedgerColumn,
): "INCOME" | "EXPENSE" {
  return column === "INCOME" || column === "SAVINGS" ? "INCOME" : "EXPENSE";
}

export const LEDGER_COLUMNS: LedgerColumn[] = [
  "INCOME",
  "EXPENSE",
  "DAILY",
  "SAVINGS",
  "CARD",
];

export type LedgerColumnVariant =
  | "income"
  | "expense"
  | "daily"
  | "savings"
  | "card";

export function ledgerColumnVariant(
  column: LedgerColumn,
): LedgerColumnVariant {
  return column.toLowerCase() as LedgerColumnVariant;
}

export const LEDGER_COLUMN_LABELS: Record<LedgerColumn, string> = {
  INCOME: "Entradas",
  EXPENSE: "Saídas",
  DAILY: "Diários",
  SAVINGS: "Economias",
  CARD: "Cartão",
};

/** Plain-language labels for tag forms and onboarding. */
export const LEDGER_COLUMN_FRIENDLY_LABELS: Record<LedgerColumn, string> = {
  INCOME: "Entra na conta",
  EXPENSE: "Conta fixa / boleto",
  DAILY: "Gasto do dia a dia",
  SAVINGS: "Guardei / investi",
  CARD: "Compra no crédito",
};

export function ledgerColumnHint(column: LedgerColumn): string {
  return copy.domain.columnHint[column];
}

export function cardEntryKindLabel(affectsBalance: boolean): string {
  return affectsBalance
    ? copy.domain.cardKind.payment
    : copy.domain.cardKind.commitment;
}

export const DEFAULT_CATEGORY_LEDGER: Record<string, PrismaLedgerColumn> = {
  Salário: "INCOME",
  Moradia: "EXPENSE",
  Contas: "EXPENSE",
  Alimentação: "DAILY",
  Diário: "DAILY",
  Fatura: "CARD",
};
