-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TransactionOrigin" AS ENUM ('USER', 'DAILY_BUDGET');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "origin" "TransactionOrigin" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_origin_idx" ON "Transaction"("userId", "date", "origin");
