-- CreateEnum
CREATE TYPE "LedgerColumn" AS ENUM ('INCOME', 'EXPENSE', 'DAILY', 'SAVINGS', 'CARD');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "ledgerColumn" "LedgerColumn" NOT NULL DEFAULT 'EXPENSE';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "ledgerColumn" "LedgerColumn";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyDivisor" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL';

-- CreateTable
CREATE TABLE "FixedMonthlyExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedMonthlyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedMonthlyExpense_userId_idx" ON "FixedMonthlyExpense"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_ledgerColumn_idx" ON "Transaction"("userId", "date", "ledgerColumn");

-- AddForeignKey
ALTER TABLE "FixedMonthlyExpense" ADD CONSTRAINT "FixedMonthlyExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
