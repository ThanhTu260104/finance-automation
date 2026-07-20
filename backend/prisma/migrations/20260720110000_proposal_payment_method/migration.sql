CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');
ALTER TABLE "proposals"
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  ADD COLUMN "cash_recipient" TEXT;
