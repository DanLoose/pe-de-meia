import type { CategoryDTO, LedgerColumn, TransactionType } from "@/types";

/**
 * Picks an internal category for a lançamento/fixo without user tag UI.
 * Prefer matching ledgerColumn, then type; never invent IDs.
 */
export function resolveDefaultCategory(
  categories: CategoryDTO[],
  options: {
    type: TransactionType;
    ledgerColumn?: LedgerColumn | null;
  },
): CategoryDTO | null {
  const ofType = categories.filter((c) => c.type === options.type);
  if (ofType.length === 0) return null;

  if (options.ledgerColumn) {
    const byColumn = ofType.find(
      (c) => c.ledgerColumn === options.ledgerColumn,
    );
    if (byColumn) return byColumn;
  }

  return ofType[0] ?? null;
}

export function resolveDefaultCategoryId(
  categories: CategoryDTO[],
  options: {
    type: TransactionType;
    ledgerColumn?: LedgerColumn | null;
  },
): string {
  return resolveDefaultCategory(categories, options)?.id ?? "";
}
