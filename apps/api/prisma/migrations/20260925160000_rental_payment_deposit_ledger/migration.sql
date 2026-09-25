CREATE TYPE "RentalPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'ONLINE_GATEWAY', 'OTHER');
CREATE TYPE "RentalPaymentEntryType" AS ENUM ('RECEIVED', 'REFUNDED');
CREATE TYPE "DepositEntryType" AS ENUM ('COLLECTED', 'REFUNDED', 'RETAINED');

CREATE TABLE "RentalPaymentEntry" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "type" "RentalPaymentEntryType" NOT NULL DEFAULT 'RECEIVED',
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "method" "RentalPaymentMethod" NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalPaymentEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RentalPaymentEntry_amountMinor_check" CHECK ("amountMinor" > 0)
);

CREATE TABLE "DepositLedgerEntry" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "type" "DepositEntryType" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT,
  "recordedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DepositLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DepositLedgerEntry_amountMinor_check" CHECK ("amountMinor" > 0)
);

CREATE INDEX "RentalPaymentEntry_businessId_reservationId_createdAt_idx" ON "RentalPaymentEntry"("businessId", "reservationId", "createdAt");
CREATE INDEX "RentalPaymentEntry_businessId_createdAt_idx" ON "RentalPaymentEntry"("businessId", "createdAt");
CREATE INDEX "DepositLedgerEntry_businessId_reservationId_createdAt_idx" ON "DepositLedgerEntry"("businessId", "reservationId", "createdAt");
CREATE INDEX "DepositLedgerEntry_businessId_createdAt_idx" ON "DepositLedgerEntry"("businessId", "createdAt");

ALTER TABLE "RentalPaymentEntry" ADD CONSTRAINT "RentalPaymentEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalPaymentEntry" ADD CONSTRAINT "RentalPaymentEntry_reservationId_businessId_fkey" FOREIGN KEY ("reservationId", "businessId") REFERENCES "Reservation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepositLedgerEntry" ADD CONSTRAINT "DepositLedgerEntry_reservationId_businessId_fkey" FOREIGN KEY ("reservationId", "businessId") REFERENCES "Reservation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
