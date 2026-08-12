-- CreateEnum
CREATE TYPE "CardInvoiceStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "cardInvoiceId" TEXT,
ADD COLUMN     "installmentCount" INTEGER,
ADD COLUMN     "installmentIndex" INTEGER;

-- CreateTable
CREATE TABLE "CardAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Cartão',
    "closingDay" INTEGER NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardAccountId" TEXT NOT NULL,
    "cycleStart" DATE NOT NULL,
    "cycleEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "CardInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "paymentTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardAccount_userId_key" ON "CardAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardInvoice_paymentTransactionId_key" ON "CardInvoice"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "CardInvoice_userId_dueDate_idx" ON "CardInvoice"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "CardInvoice_cardAccountId_status_idx" ON "CardInvoice"("cardAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CardInvoice_cardAccountId_cycleEnd_key" ON "CardInvoice"("cardAccountId", "cycleEnd");

-- CreateIndex
CREATE INDEX "Transaction_cardInvoiceId_idx" ON "Transaction"("cardInvoiceId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cardInvoiceId_fkey" FOREIGN KEY ("cardInvoiceId") REFERENCES "CardInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardAccount" ADD CONSTRAINT "CardAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInvoice" ADD CONSTRAINT "CardInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInvoice" ADD CONSTRAINT "CardInvoice_cardAccountId_fkey" FOREIGN KEY ("cardAccountId") REFERENCES "CardAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInvoice" ADD CONSTRAINT "CardInvoice_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default card account for existing users (close day 1, due day 10)
INSERT INTO "CardAccount" ("id", "userId", "name", "closingDay", "dueDay", "createdAt", "updatedAt")
SELECT 'card_' || "id", "id", 'Cartão', 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "CardAccount" WHERE "CardAccount"."userId" = "User"."id"
);
