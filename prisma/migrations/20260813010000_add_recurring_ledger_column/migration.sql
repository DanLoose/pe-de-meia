-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN IF NOT EXISTS "ledgerColumn" "LedgerColumn";

-- Backfill from category (income stays INCOME; others keep category column)
UPDATE "RecurringTransaction" AS r
SET "ledgerColumn" = c."ledgerColumn"
FROM "Category" AS c
WHERE r."categoryId" = c.id
  AND r."ledgerColumn" IS NULL;

-- Income rules always INCOME
UPDATE "RecurringTransaction"
SET "ledgerColumn" = 'INCOME'
WHERE "type" = 'INCOME';

-- Remaining nulls (shouldn't happen) default to EXPENSE
UPDATE "RecurringTransaction"
SET "ledgerColumn" = 'EXPENSE'
WHERE "ledgerColumn" IS NULL;

ALTER TABLE "RecurringTransaction" ALTER COLUMN "ledgerColumn" SET NOT NULL;
ALTER TABLE "RecurringTransaction" ALTER COLUMN "ledgerColumn" SET DEFAULT 'EXPENSE';
